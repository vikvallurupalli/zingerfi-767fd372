import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Copy, Trash2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
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
              <Button onClick={handleOutlook} variant="outlook" size="sm" className="gap-1 text-xs">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h14.9q.44 0 .75.3.3.3.3.75V12zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.9 0 1.6-.3.7-.32 1.19-.86.48-.55.73-1.28.25-.74.25-1.61 0-.83-.25-1.55-.24-.71-.71-1.24t-1.15-.83q-.68-.3-1.55-.3H1v7.97h4.98zm6.52-8.99V5.48l-.48.11q-.25.06-.48.09L11 5.87v3.12zm0 9V12H9.26l-.74-.11-.48-.11v4.2h4.46zM21.99 12l-6.28 3.9v2.87l7.5-4.65v-2.12H21.99z"/>
                </svg>
                Outlook
              </Button>
              <Button onClick={handleGmail} variant="gmail" size="sm" className="gap-1 text-xs">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
                Gmail
              </Button>
              <Button onClick={handleCopy} variant="secondary" size="sm" className="gap-1 text-xs">
                <Copy className="h-3 w-3" />
                Copy
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
      </div>
    </Layout>
  );
}
