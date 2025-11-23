import { useState, useEffect } from "react";
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
  const [senderEmail, setSenderEmail] = useState("");
  const [encryptedText, setEncryptedText] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [confides, setConfides] = useState<Confide[]>([]);

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
            <CardTitle>Select Sender</CardTitle>
            <CardDescription>Choose the confide who sent you this message</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="sender-select">Sender</Label>
              <Select value={senderEmail} onValueChange={setSenderEmail}>
                <SelectTrigger id="sender-select">
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
                <p className="text-sm text-muted-foreground">
                  No confides found. Add confides to decrypt messages.
                </p>
              )}
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
