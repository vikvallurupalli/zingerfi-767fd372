import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Copy, Trash2, MessageSquare, Send, Zap, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { fastEncrypt, formatFastEncryptPayload } from "@/lib/fast-crypto";
import { NewRecipientDialog } from "@/components/NewRecipientDialog";
import { useSearchParams, useNavigate } from "react-router-dom";

// ─── Configurable limits ───
const FREE_MESSAGE_LIMIT = 50;
const PAID_CYCLE_SIZE = 500;

interface Contact {
  id: string;
  email: string;
  name: string;
}

interface ManualRecipient {
  email: string;
  alias?: string;
}

export default function FastEncryptPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState("");
  const [manualRecipient, setManualRecipient] = useState<ManualRecipient | null>(null);
  const [showNewRecipient, setShowNewRecipient] = useState(false);
  const [message, setMessage] = useState("");
  const [encryptedText, setEncryptedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [unlockCount, setUnlockCount] = useState(0);
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    if (user) {
      loadContacts();
      loadUsageData();
    }
  }, [user]);

  // Handle payment success redirect
  useEffect(() => {
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    if (payment === "success" && sessionId && user && !recordingPayment) {
      recordPayment(sessionId);
    }
  }, [searchParams, user]);

  const loadUsageData = async () => {
    if (!user) return;

    // Count total messages sent
    const { count, error: countError } = await supabase
      .from("fast_encrypt_messages" as any)
      .select("*", { count: "exact", head: true })
      .eq("sender_id", user.id);

    if (!countError && count !== null) {
      setMessageCount(count);
    }

    // Count unlocks for this user
    const { count: uCount, error: uError } = await supabase
      .from("fast_encrypt_unlocks" as any)
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (!uError && uCount !== null) {
      setUnlockCount(uCount);
    }
  };

  const recordPayment = async (sessionId: string) => {
    setRecordingPayment(true);
    try {
      const currentCycle = Math.floor(messageCount / PAID_CYCLE_SIZE);
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("record-fast-encrypt-payment", {
        body: { session_id: sessionId, cycle_number: currentCycle },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) {
        console.error("Error recording payment:", error);
      } else {
        toast.success("Payment recorded! You can now send more messages.");
        await loadUsageData();
      }
    } catch (err) {
      console.error("Payment recording failed:", err);
    } finally {
      setRecordingPayment(false);
      // Clear URL params
      navigate("/fast-encrypt", { replace: true });
    }
  };

  const canSendMessage = (): boolean => {
    // First FREE_MESSAGE_LIMIT messages are free
    if (messageCount < FREE_MESSAGE_LIMIT) return true;
    // After that, each unlock grants PAID_CYCLE_SIZE messages
    // Cycle 0: messages 0–499 (first 50 free, then need unlock for 50–499)
    // Cycle 1: messages 500–999, etc.
    const currentCycle = Math.floor(messageCount / PAID_CYCLE_SIZE);
    return unlockCount > currentCycle || (currentCycle === 0 && unlockCount >= 1);
  };

  const getRemainingMessages = (): number => {
    if (messageCount < FREE_MESSAGE_LIMIT) {
      return FREE_MESSAGE_LIMIT - messageCount;
    }
    const currentCycleEnd = (Math.floor(messageCount / PAID_CYCLE_SIZE) + 1) * PAID_CYCLE_SIZE;
    return currentCycleEnd - messageCount;
  };

  const handlePayment = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("create-fast-encrypt-payment", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("Failed to start payment");
    }
  };

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
    if (manualRecipient) return manualRecipient.email;
    const contact = contacts.find((c) => c.id === selectedContact);
    return contact?.email || "";
  };

  const handleAddManualRecipient = (email: string, alias?: string) => {
    setManualRecipient({ email, alias });
    setSelectedContact("");
  };

  const handleEncrypt = async () => {
    if (!canSendMessage()) {
      handlePayment();
      return;
    }

    const recipientEmail = getRecipientEmail();
    if (!recipientEmail || !message || !user) {
      toast.error("Please enter a recipient email and message");
      return;
    }

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
      const { data: initData, error: initError } = await supabase.functions.invoke("fast-encrypt-init");
      if (initError || !initData?.public_key) {
        throw new Error("Failed to get encryption key");
      }

      const { keypair_id, public_key } = initData;
      const { ephemeralPublicKey, encryptedData } = await fastEncrypt(message, public_key);
      const messageUid = crypto.randomUUID();

      const { error: insertError } = await supabase
        .from("fast_encrypt_messages" as any)
        .insert({
          message_uid: messageUid,
          sender_id: user.id,
          recipient_email: recipientEmail,
          keypair_id: keypair_id,
        });

      if (insertError) throw new Error("Failed to save message record");

      const payload = formatFastEncryptPayload(messageUid, ephemeralPublicKey, encryptedData);
      setEncryptedText(payload);
      setMessageCount((prev) => prev + 1);
      toast.success("Message encrypted successfully!");

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
      .insert({ user_id: user.id, email: emailToSave, name });
    if (error) {
      if (error.code === "23505") toast.info("This contact already exists");
      else toast.error("Failed to save contact");
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

  const handleSMS = () => { window.location.href = `sms:?body=${encodeURIComponent(createShareLink())}`; };
  const handleWhatsApp = () => { window.location.href = `https://wa.me/?text=${encodeURIComponent(createShareLink())}`; };
  const handleTelegram = () => { window.location.href = `https://t.me/share/url?url=${encodeURIComponent(createShareLink())}`; };
  const handleGmail = () => { window.location.href = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('FastEncrypt Message')}&body=${encodeURIComponent(createShareLink())}`; };
  const handleOutlook = () => { window.location.href = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent('FastEncrypt Message')}&body=${encodeURIComponent(createShareLink())}`; };

  const showPaymentWall = !canSendMessage();

  return (
    <Layout>
      <div className="max-w-md mx-auto space-y-3">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold">FastEncrypt Message</h1>
          <p className="text-xs text-muted-foreground">
            Encrypt a message for any email address
          </p>
          {!showPaymentWall && (
            <p className="text-xs text-muted-foreground">
              {getRemainingMessages()} messages remaining
            </p>
          )}
        </div>

        {showPaymentWall ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-center space-y-3">
              <p className="text-sm font-medium">
                You've used all your free messages ({FREE_MESSAGE_LIMIT}).
              </p>
              <p className="text-xs text-muted-foreground">
                Unlock up to {PAID_CYCLE_SIZE} more messages for just $0.99.
              </p>
              <Button onClick={handlePayment} className="gap-1">
                <Zap className="h-4 w-4" />
                Unlock Messages — $0.99
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Recipient Selection */}
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm">Recipient</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1 space-y-2">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Select Contact</Label>
                    <Select value={selectedContact} onValueChange={(val) => {
                      setSelectedContact(val);
                      setManualRecipient(null);
                    }}>
                      <SelectTrigger className="h-8 text-xs">
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
                    className="gap-1 shrink-0 h-8 text-xs"
                    onClick={() => setShowNewRecipient(true)}
                  >
                    <UserPlus className="h-3 w-3" />
                    New
                  </Button>
                </div>

                {manualRecipient && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs">
                    <span className="font-medium">{manualRecipient.alias || manualRecipient.email}</span>
                    {manualRecipient.alias && (
                      <span className="text-muted-foreground ml-1">({manualRecipient.email})</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message Input */}
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm">Message</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1 space-y-2">
                <Textarea
                  placeholder="Enter your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleEncrypt}
                    disabled={loading || !getRecipientEmail() || !message}
                    className="gap-1 h-8 text-xs"
                    size="sm"
                  >
                    <Lock className="h-3 w-3" />
                    {loading ? "Encrypting..." : "Encrypt"}
                  </Button>
                  <Button variant="outline" onClick={handleClear} className="gap-1 h-8 text-xs" size="sm">
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Share Buttons */}
            {encryptedText && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs text-center text-muted-foreground">
                    ✅ Encrypted! Share via:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={handleSMS} variant="sms" size="sm" className="gap-1 text-xs h-8">
                      <MessageSquare className="h-3 w-3" />
                      SMS
                    </Button>
                    <Button onClick={handleWhatsApp} variant="whatsapp" size="sm" className="gap-1 text-xs h-8">
                      <Send className="h-3 w-3" />
                      WhatsApp
                    </Button>
                    <Button onClick={handleTelegram} variant="telegram" size="sm" className="gap-1 text-xs h-8">
                      <Send className="h-3 w-3" />
                      Telegram
                    </Button>
                    <Button onClick={handleGmail} variant="gmail" size="sm" className="gap-1 text-xs h-8">
                      <Send className="h-3 w-3" />
                      Gmail
                    </Button>
                    <Button onClick={handleOutlook} variant="outlook" size="sm" className="gap-1 text-xs h-8">
                      <Send className="h-3 w-3" />
                      Outlook
                    </Button>
                    <Button onClick={handleCopy} variant="secondary" size="sm" className="gap-1 text-xs h-8">
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
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
