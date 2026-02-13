import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Copy, Trash2, MessageSquare, Send, Zap, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { fastEncrypt, formatFastEncryptPayload } from "@/lib/fast-crypto";

import { NewRecipientDialog } from "@/components/NewRecipientDialog";

interface Contact {
  id: string;
  email: string;
  name: string;
}

const NEW_EMAIL_VALUE = "__new_email__";

interface ManualRecipient {
  email: string;
  alias?: string;
}

export default function FastEncryptPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState("");
  const [manualRecipient, setManualRecipient] = useState<ManualRecipient | null>(null);
  const [showNewRecipient, setShowNewRecipient] = useState(false);
  const [message, setMessage] = useState("");
  const [encryptedText, setEncryptedText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) loadContacts();
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("fast_encrypt_contacts" as any)
      .select("id, email, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading contacts:", error);
      return;
    }
    setContacts((data as any) || []);
  };

  const getRecipientEmail = (): string => {
    if (manualRecipient) {
      return manualRecipient.email;
    }
    const contact = contacts.find((c) => c.id === selectedContact);
    return contact?.email || "";
  };

  const handleAddManualRecipient = (email: string, alias?: string) => {
    setManualRecipient({ email, alias });
    setSelectedContact("");
  };

  const handleEncrypt = async () => {
    const recipientEmail = getRecipientEmail();
    if (!recipientEmail || !message || !user) {
      toast.error("Please enter a recipient email and message");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!recipientEmail.toLowerCase().endsWith("@gmail.com")) {
      toast.error("Only Gmail addresses are supported");
      return;
    }

    setLoading(true);
    try {
      // Get the system public key from edge function
      const { data: initData, error: initError } = await supabase.functions.invoke("fast-encrypt-init");

      if (initError || !initData?.public_key) {
        console.error("Init error:", initError, initData);
        throw new Error("Failed to get encryption key");
      }

      const { keypair_id, public_key } = initData;

      // Encrypt the message client-side
      const { ephemeralPublicKey, encryptedData } = await fastEncrypt(message, public_key);

      // Generate unique message ID
      const messageUid = crypto.randomUUID();

      // Save message metadata to DB (no actual message content)
      const { error: insertError } = await supabase
        .from("fast_encrypt_messages" as any)
        .insert({
          message_uid: messageUid,
          sender_id: user.id,
          recipient_email: recipientEmail,
          keypair_id: keypair_id,
        });

      if (insertError) {
        console.error("Error saving message:", insertError);
        throw new Error("Failed to save message record");
      }

      // Format the shareable payload
      const payload = formatFastEncryptPayload(messageUid, ephemeralPublicKey, encryptedData);
      setEncryptedText(payload);

      toast.success("Message encrypted successfully!");

      // Auto-save contact if manual recipient with alias was provided
      if (manualRecipient?.alias) {
        const alreadyExists = contacts.some(
          (c) => c.email.toLowerCase() === recipientEmail.toLowerCase()
        );
        if (!alreadyExists) {
          await handleSaveContact(manualRecipient.alias);
        }
      }
    } catch (error) {
      console.error("Encryption error:", error);
      toast.error("Failed to encrypt message");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async (name: string) => {
    if (!user) return;
    const emailToSave = getRecipientEmail();
    if (!emailToSave) return;
    
    const { error } = await supabase
      .from("fast_encrypt_contacts" as any)
      .insert({
        user_id: user.id,
        email: emailToSave,
        name: name,
      });

    if (error) {
      if (error.code === "23505") {
        toast.info("This contact already exists");
      } else {
        console.error("Error saving contact:", error);
        toast.error("Failed to save contact");
      }
      return;
    }

    toast.success("Contact saved!");
    await loadContacts();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(encryptedText);
    toast.success("Encrypted message copied to clipboard");
  };

  const handleClear = () => {
    setMessage("");
    setEncryptedText("");
    setSelectedContact("");
    setManualRecipient(null);
  };

  const createShareLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/fast-decrypt?m=${encodeURIComponent(encryptedText)}`;
  };

  const handleSMS = () => {
    window.location.href = `sms:?body=${encodeURIComponent(createShareLink())}`;
  };

  const handleWhatsApp = () => {
    window.location.href = `https://wa.me/?text=${encodeURIComponent(createShareLink())}`;
  };

  const handleTelegram = () => {
    window.location.href = `https://t.me/share/url?url=${encodeURIComponent(createShareLink())}`;
  };

  const handleGmail = () => {
    window.location.href = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('FastEncrypt Message')}&body=${encodeURIComponent(createShareLink())}`;
  };

  const handleOutlook = () => {
    window.location.href = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent('FastEncrypt Message')}&body=${encodeURIComponent(createShareLink())}`;
  };

  return (
    <Layout>
      <div className="max-w-[42rem] mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">FastEncrypt Message</h1>
          <p className="text-muted-foreground">
            Encrypt a message for any email address — no confide setup needed
          </p>
        </div>

        {/* Recipient Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Recipient</CardTitle>
            <CardDescription>Choose a saved contact or add a new recipient</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Select Contact</Label>
                <Select value={selectedContact} onValueChange={(val) => {
                  setSelectedContact(val);
                  setManualRecipient(null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose recipient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} ({contact.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                onClick={() => setShowNewRecipient(true)}
              >
                <UserPlus className="h-4 w-4" />
                Enter New
              </Button>
            </div>

            {manualRecipient && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                <span className="font-medium">{manualRecipient.alias || manualRecipient.email}</span>
                {manualRecipient.alias && (
                  <span className="text-muted-foreground ml-1">({manualRecipient.email})</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Input */}
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
                  disabled={loading || !getRecipientEmail() || !message}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {loading ? "Encrypting..." : "Encrypt"}
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
              <Button onClick={handleGmail} variant="outline" size="sm" className="gap-1 text-xs">
                <Send className="h-3 w-3" />
                Gmail
              </Button>
              <Button onClick={handleOutlook} variant="outline" size="sm" className="gap-1 text-xs">
                <Send className="h-3 w-3" />
                Outlook
              </Button>
              <Button onClick={handleCopy} variant="secondary" size="sm" className="gap-1 text-xs h-auto py-2 whitespace-normal text-center">
                <Copy className="h-3 w-3 flex-shrink-0" />
                Copy
              </Button>
            </div>
          )}
        </div>

        {encryptedText && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <p className="text-sm text-center text-muted-foreground">
                ✅ Encryption complete! Use the buttons above to share the encrypted message. Only the intended recipient can decrypt it (one time only).
              </p>
            </CardContent>
          </Card>
        )}

        <NewRecipientDialog
          open={showNewRecipient}
          onOpenChange={setShowNewRecipient}
          onAdd={handleAddManualRecipient}
        />
      </div>
    </Layout>
  );
}
