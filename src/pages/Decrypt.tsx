import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Unlock, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  decryptMessage,
  importPublicKey,
  importPrivateKey,
  retrievePrivateKey,
} from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";

interface Confide {
  id: string;
  confide_user_id: string;
  alias: string | null;
  profiles: {
    email: string;
  };
}


export default function Decrypt() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [senderEmail, setSenderEmail] = useState("");
  const [encryptedText, setEncryptedText] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [confides, setConfides] = useState<Confide[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);

  useEffect(() => {
    loadConfides();
    
    // Check for encrypted message in URL
    const messageFromUrl = searchParams.get("message");
    if (messageFromUrl) {
      setEncryptedText(decodeURIComponent(messageFromUrl));
    }
  }, [user, searchParams]);

  const loadConfides = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("confides")
      .select(`
        id,
        confide_user_id,
        alias,
        profiles!confides_confide_user_id_fkey (
          email
        )
      `)
      .eq("user_id", user.id)
      .order("alias", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error loading confides:", error);
      return;
    }

    setConfides(data as any || []);
  };

  const handleDecrypt = async () => {
    if (!encryptedText || !senderEmail || !user) {
      toast.error("Please enter sender email and encrypted text");
      return;
    }

    setLoading(true);
    try {
      // Check if message was already decrypted
      const { data: existingDecryption, error: checkError } = await supabase
        .from("decrypted_messages")
        .select("id")
        .eq("message_hash", encryptedText)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking decryption status:", checkError);
        throw new Error("Failed to verify message status");
      }

      if (existingDecryption) {
        toast.error("This message has already been decrypted and cannot be decrypted again");
        setLoading(false);
        return;
      }

      // Get sender's public key
      const { data: senderProfile, error: senderError } = await supabase
        .from("profiles")
        .select("public_key")
        .eq("email", senderEmail)
        .single();

      if (senderError || !senderProfile) {
        throw new Error("Sender not found");
      }

      const senderPublicKey = await importPublicKey(senderProfile.public_key);

      // Get own private key from IndexedDB
      const privateKeyData = await retrievePrivateKey(user.id);
      if (!privateKeyData) throw new Error("Private key not found");
      const privateKey = await importPrivateKey(privateKeyData);

      // Decrypt message
      const decrypted = await decryptMessage(
        encryptedText,
        senderPublicKey,
        privateKey
      );

      // Record that this message has been decrypted
      const { error: insertError } = await supabase
        .from("decrypted_messages")
        .insert({
          message_hash: encryptedText,
          decrypted_by: user.id
        });

      if (insertError) {
        console.error("Error recording decryption:", insertError);
        // Still show the decrypted message even if recording fails
      }

      setDecryptedMessage(decrypted);
      setShowWarningModal(true);
    } catch (error) {
      console.error("Decryption error:", error);
      toast.error("Failed to decrypt message. Please check the sender email and encrypted text.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(decryptedMessage);
    toast.success("Decrypted message copied to clipboard");
  };

  const handleClear = () => {
    setSenderEmail("");
    setEncryptedText("");
    setDecryptedMessage("");
  };

  return (
    <Layout>
      <div className="max-w-[70rem] mx-auto space-y-6">
        <div className="text-center space-y-2 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <Unlock className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-3xl font-bold">Decrypt Message</h1>
          <p className="text-muted-foreground">
            Paste the encrypted text you received to decrypt it
          </p>
        </div>

        <Card className="max-w-[25rem] mx-auto">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Select Sender</CardTitle>
            <CardDescription className="text-xs">Choose the confide who sent you this message</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="sender-select" className="text-xs">Sender</Label>
              <Select value={senderEmail} onValueChange={setSenderEmail}>
                <SelectTrigger id="sender-select" className="h-8 text-sm">
                  <SelectValue placeholder="Select a confide..." />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {confides.map((confide) => (
                    <SelectItem key={confide.id} value={confide.profiles.email}>
                      {confide.alias || confide.profiles.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {confides.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No confides found. Add confides to decrypt messages.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
          <Card className="scale-[0.6] origin-top w-[166.67%]">
            <CardHeader>
              <CardTitle className="text-xl">Encrypted Message</CardTitle>
              <CardDescription className="text-base">Paste the encrypted text here</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste encrypted text here..."
                value={encryptedText}
                onChange={(e) => setEncryptedText(e.target.value)}
                rows={8}
                className="resize-none font-mono-encrypted text-base break-all text-foreground"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleDecrypt}
                  disabled={loading || !encryptedText || !senderEmail}
                  className="gap-2 h-12 px-6 text-lg"
                >
                  <Unlock className="h-5 w-5" />
                  Decrypt
                </Button>
                <Button variant="outline" onClick={handleClear} className="gap-2 h-12 px-6 text-lg">
                  <Trash2 className="h-5 w-5" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={`scale-[0.6] origin-top w-[166.67%] border-success/50 ${!decryptedMessage ? 'opacity-50' : ''}`}>
            <CardHeader>
              <CardTitle className="text-xl">Decrypted Message</CardTitle>
              <CardDescription className="text-base">Your decrypted message is ready</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  value={decryptedMessage}
                  readOnly
                  rows={8}
                  placeholder="Decrypted message will appear here..."
                  className="resize-none text-lg font-medium text-foreground"
                />
              </div>
              <Button onClick={handleCopy} disabled={!decryptedMessage} className="w-full gap-2 h-12 text-lg">
                <Copy className="h-5 w-5" />
                Copy to Clipboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Message Decrypted</AlertDialogTitle>
            <AlertDialogDescription>
              This message cannot be decrypted again. Please save the decrypted message if you need to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarningModal(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
