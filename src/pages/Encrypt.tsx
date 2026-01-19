import { useState, useEffect, useRef } from "react";
import { usePWADetection } from "@/hooks/use-pwa-detection";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Copy, Trash2, MessageSquare, Send, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  encryptMessage,
  importPublicKey,
  importPrivateKey,
  retrievePrivateKey,
} from "@/lib/crypto";

interface Confide {
  id: string;
  confide_user_id: string;
  alias: string | null;
  profiles: {
    email: string;
    public_key: string;
  };
}

export default function Encrypt() {
  const { user } = useAuth();
  const [confides, setConfides] = useState<Confide[]>([]);
  const [selectedConfide, setSelectedConfide] = useState<string>("");
  const [message, setMessage] = useState("");
  const [encryptedText, setEncryptedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSpeechErrorDialog, setShowSpeechErrorDialog] = useState(false);
  const [speechErrorMessage, setSpeechErrorMessage] = useState("");
  const [showPWAWarningDialog, setShowPWAWarningDialog] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { isPWA } = usePWADetection();

  useEffect(() => {
    loadConfides();
  }, [user]);

  const loadConfides = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("confides")
      .select(`
        id,
        confide_user_id,
        alias,
        profiles!confides_confide_user_id_fkey (
          email,
          public_key
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "accepted");

    if (error) {
      toast.error("Failed to load confides");
      console.error(error);
      return;
    }

    setConfides(data as any || []);
  };

  const handleEncrypt = async () => {
    if (!selectedConfide || !message || !user) {
      toast.error("Please select a confide and enter a message");
      return;
    }

    setLoading(true);
    try {
      const confide = confides.find((c) => c.confide_user_id === selectedConfide);
      if (!confide) throw new Error("Confide not found");

      // Get recipient's public key
      const recipientPublicKey = await importPublicKey(confide.profiles.public_key);

      // Get own private key from IndexedDB
      const privateKeyData = await retrievePrivateKey(user.id);
      if (!privateKeyData) throw new Error("Private key not found");
      const privateKey = await importPrivateKey(privateKeyData);

      // Encrypt message
      const encrypted = await encryptMessage(message, recipientPublicKey, privateKey);
      setEncryptedText(encrypted);

      toast.success("Message encrypted successfully");
    } catch (error) {
      console.error("Encryption error:", error);
      toast.error("Failed to encrypt message");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const link = createShareLink();
    navigator.clipboard.writeText(link);
    toast.success("Encrypted link copied to clipboard");
  };

  const handleClear = () => {
    setMessage("");
    setEncryptedText("");
    setSelectedConfide("");
  };

  const createShareLink = () => {
    return `https://www.zingerfi.com/decrypt?message=${encodeURIComponent(encryptedText)}`;
  };

  const handleSMS = () => {
    const link = createShareLink();
    window.location.href = `sms:?body=${encodeURIComponent(link)}`;
  };

  const handleWhatsApp = () => {
    const link = createShareLink();
    window.location.href = `https://wa.me/?text=${encodeURIComponent(link)}`;
  };

  const handleTelegram = () => {
    const link = createShareLink();
    window.location.href = `https://t.me/share/url?url=${encodeURIComponent(link)}`;
  };

  const handleOutlook = () => {
    const link = createShareLink();
    window.location.href = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent('Encrypted Message')}&body=${encodeURIComponent(link)}`;
  };

  const handleGmail = () => {
    const link = createShareLink();
    window.location.href = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('Encrypted Message')}&body=${encodeURIComponent(link)}`;
  };

  const showSpeechError = (errorType: string) => {
    let message = "";
    switch (errorType) {
      case "not-allowed":
        message = "Microphone access was denied.";
        break;
      case "no-speech":
        message = "No speech was detected. Please try again.";
        break;
      case "audio-capture":
        message = "No microphone was found or it's not working properly.";
        break;
      case "network":
        message = "A network error occurred during speech recognition.";
        break;
      case "not-supported":
        message = "Speech recognition is not supported in your browser.";
        break;
      default:
        message = `Speech recognition error: ${errorType}`;
    }
    setSpeechErrorMessage(message);
    setShowSpeechErrorDialog(true);
  };

  const startListening = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      showSpeechError("not-supported");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast.success("Listening... Speak now");
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setMessage((prev) => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      showSpeechError(event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast.info("Stopped listening");
    }
  };

  const toggleListening = () => {
    if (isPWA) {
      setShowPWAWarningDialog(true);
      return;
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <Layout>
      <div className="max-w-[42rem] mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Encrypt Message</h1>
          <p className="text-muted-foreground">
            Select a confide and encrypt your message
          </p>
        </div>

        <Card>
          <CardHeader>
            <Button 
              size="sm"
              className="h-8 text-sm px-4 w-fit"
              onClick={() => window.location.href = '/send-request'}
            >
             Click here to Add Confidee if not found in dropdown below
            </Button>
            <CardTitle className="mt-4">Select Confide</CardTitle>
            <CardDescription>Choose who can decrypt this message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedConfide} onValueChange={setSelectedConfide}>
              <SelectTrigger>
                <SelectValue placeholder="Select a confide" />
              </SelectTrigger>
              <SelectContent>
                {confides.length === 0 ? (
                  <div className="p-4 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Your confide list is empty
                    </p>
                    <Button 
                      size="sm" 
                      onClick={() => window.location.href = '/send-request'}
                      className="gap-2"
                    >
                      Add Confide
                    </Button>
                  </div>
                ) : (
                  confides.map((confide) => (
                    <SelectItem key={confide.id} value={confide.confide_user_id}>
                      {confide.alias || confide.profiles.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Note: Confidees must have registered by logging in with their Google account.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Message</CardTitle>
              <CardDescription>Enter the message you want to encrypt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="resize-none text-base"
              />
              {isListening && (
                <p className="text-sm text-primary animate-pulse">🎤 Listening... Speak now</p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleEncrypt}
                  disabled={loading || !selectedConfide || !message}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Encrypt
                </Button>
                <Button variant="outline" onClick={handleClear} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {encryptedText && (
            <div className="flex flex-col gap-2 w-32">
              <Button onClick={handleSMS} variant="sms" size="sm" className="gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                SMS
              </Button>
              <Button onClick={handleWhatsApp} variant="whatsapp" size="sm" className="gap-1 text-xs">
                <Send className="h-3 w-3" />
                WhatsApp
              </Button>
              <Button onClick={handleTelegram} variant="telegram" size="sm" className="gap-1 text-xs">
                <Send className="h-3 w-3" />
                Telegram
              </Button>
              <Button onClick={handleCopy} variant="secondary" size="sm" className="gap-1 text-xs h-auto py-2 whitespace-normal text-center">
                <Copy className="h-3 w-3 flex-shrink-0" />
                Copy to send it another way
              </Button>
            </div>
          )}
        </div>

        {encryptedText && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <p className="text-sm text-center text-muted-foreground">
                Encryption complete! Use the buttons above to send or copy the encrypted message.
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={showSpeechErrorDialog} onOpenChange={setShowSpeechErrorDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">Speech Recognition Error</DialogTitle>
              <DialogDescription className="space-y-4 pt-4">
                <p>{speechErrorMessage}</p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-semibold text-foreground">💡 Tip:</p>
                  <p className="text-sm">
                    Make sure speech recognition is enabled in your browser settings. 
                    Go to <strong>Settings → Apps → [Your Browser]</strong> and ensure that 
                    microphone access and speech recognition permissions are turned on.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    For Chrome: Settings → Privacy and Security → Site Settings → Microphone
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button onClick={() => setShowSpeechErrorDialog(false)}>
                Got it
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showPWAWarningDialog} onOpenChange={setShowPWAWarningDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-primary">Browser Required</DialogTitle>
              <DialogDescription className="space-y-4 pt-4">
                <p>Speech recognition requires a browser and cannot be used in app mode.</p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-semibold text-foreground">💡 Tip:</p>
                  <p className="text-sm">
                    To use the voice input feature, please open this page in your web browser 
                    (Safari, Chrome, etc.) instead of the installed app.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button onClick={() => setShowPWAWarningDialog(false)}>
                Got it
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
