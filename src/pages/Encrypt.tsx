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
    navigator.clipboard.writeText(encryptedText);
    toast.success("Encrypted text copied to clipboard");
  };

  const handleClear = () => {
    setMessage("");
    setEncryptedText("");
    setSelectedConfide("");
  };

  const createShareLink = () => {
    return `https://zingerfi.lovable.app/decrypt?message=${encodeURIComponent(encryptedText)}`;
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
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
            <CardTitle>Select Confide</CardTitle>
            <CardDescription>Choose who can decrypt this message</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedConfide} onValueChange={setSelectedConfide}>
              <SelectTrigger>
                <SelectValue placeholder="Select a confide" />
              </SelectTrigger>
              <SelectContent>
                {confides.map((confide) => (
                  <SelectItem key={confide.id} value={confide.confide_user_id}>
                    {confide.alias || confide.profiles.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {confides.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No confides yet. Send a request to add someone.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
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
              className="resize-none"
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
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle>Encrypted Message</CardTitle>
              <CardDescription>Copy this text and send it via any channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  value={encryptedText}
                  readOnly
                  rows={8}
                  className="resize-none font-mono-encrypted text-xs break-all"
                />
              </div>
              <Button onClick={handleCopy} className="w-full gap-2">
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </Button>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button onClick={handleSMS} variant="outline" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  SMS
                </Button>
                <Button onClick={handleWhatsApp} variant="outline" className="gap-2">
                  <Send className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button onClick={handleTelegram} variant="outline" className="gap-2">
                  <Send className="h-4 w-4" />
                  Telegram
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
