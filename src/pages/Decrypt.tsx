import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Unlock, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  decryptMessage,
  importPublicKey,
  importPrivateKey,
  retrievePrivateKey,
} from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";

export default function Decrypt() {
  const { user } = useAuth();
  const [senderEmail, setSenderEmail] = useState("");
  const [encryptedText, setEncryptedText] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDecrypt = async () => {
    if (!encryptedText || !senderEmail || !user) {
      toast.error("Please enter sender email and encrypted text");
      return;
    }

    setLoading(true);
    try {
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
      setDecryptedMessage(decrypted);

      toast.success("Message decrypted successfully");
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <Unlock className="h-6 w-6 text-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Decrypt Message</h1>
          <p className="text-muted-foreground">
            Paste the encrypted text you received to decrypt it
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sender Email</CardTitle>
            <CardDescription>Enter the email of the person who sent you this message</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="sender-email">Sender Email Address</Label>
              <Input
                id="sender-email"
                type="email"
                placeholder="sender@example.com"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Encrypted Message</CardTitle>
            <CardDescription>Paste the encrypted text here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste encrypted text here..."
              value={encryptedText}
              onChange={(e) => setEncryptedText(e.target.value)}
              rows={8}
              className="resize-none font-mono-encrypted text-xs break-all"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleDecrypt}
                disabled={loading || !encryptedText || !senderEmail}
                className="gap-2"
              >
                <Unlock className="h-4 w-4" />
                Decrypt
              </Button>
              <Button variant="outline" onClick={handleClear} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {decryptedMessage && (
          <Card className="border-success/50">
            <CardHeader>
              <CardTitle>Decrypted Message</CardTitle>
              <CardDescription>Your decrypted message is ready</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  value={decryptedMessage}
                  readOnly
                  rows={6}
                  className="resize-none"
                />
              </div>
              <Button onClick={handleCopy} className="w-full gap-2">
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
