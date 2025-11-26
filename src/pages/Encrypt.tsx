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
            <div className="flex items-center gap-3">
              <Button 
                size="sm"
                className="h-8 text-sm px-4"
                onClick={() => window.location.href = '/send-request'}
              >
                Add Confidee
              </Button>
              <CardTitle>Select Confide</CardTitle>
            </div>
            <CardDescription>Choose who can decrypt this message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Button onClick={handleSMS} variant="outline" size="sm" className="gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                SMS
              </Button>
              <Button onClick={handleWhatsApp} variant="outline" size="sm" className="gap-1 text-xs">
                <Send className="h-3 w-3" />
                WhatsApp
              </Button>
              <Button onClick={handleTelegram} variant="outline" size="sm" className="gap-1 text-xs">
                <Send className="h-3 w-3" />
                Telegram
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
