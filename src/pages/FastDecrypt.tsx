import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Unlock, Copy, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { parseFastEncryptPayload } from "@/lib/fast-crypto";

export default function FastDecryptPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [encryptedInput, setEncryptedInput] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showAlreadyDecryptedModal, setShowAlreadyDecryptedModal] = useState(false);
  const [showStolenMessageModal, setShowStolenMessageModal] = useState(false);

  // Pre-populate from URL parameter
  useEffect(() => {
    const messageParam = searchParams.get("m");
    if (messageParam) {
      setEncryptedInput(messageParam);
    }
  }, [searchParams]);

  const handleDecrypt = async () => {
    if (!encryptedInput || !user) {
      toast.error("Please paste the encrypted message");
      return;
    }

    // Parse the FEID payload
    const parsed = parseFastEncryptPayload(encryptedInput);
    if (!parsed) {
      toast.error("Invalid encrypted message format. Make sure you pasted the complete FEID message.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fast-decrypt", {
        body: {
          message_uid: parsed.messageUid,
          ephemeral_public_key: parsed.ephemeralPublicKey,
          encrypted_data: parsed.encryptedData,
        },
      });

      if (error) {
        console.error("Decrypt function error:", error);
        // Check for specific error status codes from the edge function
        try {
          const errorBody = JSON.parse(error.message || "{}");
          if (error.message?.includes("already been decrypted")) {
            setShowAlreadyDecryptedModal(true);
            return;
          }
          if (error.message?.includes("not the intended recipient")) {
            setShowStolenMessageModal(true);
            return;
          }
        } catch {}
        
        // Try context from error.context if available
        if (error.context) {
          try {
            const ctx = await error.context.json();
            if (ctx?.error?.includes("already been decrypted")) {
              setShowAlreadyDecryptedModal(true);
              return;
            }
            if (ctx?.error?.includes("not the intended recipient")) {
              setShowStolenMessageModal(true);
              return;
            }
          } catch {}
        }
        
        throw new Error(error.message || "Decryption failed");
      }

      if (data?.error) {
        if (data.error.includes("already been decrypted")) {
          setShowAlreadyDecryptedModal(true);
          return;
        }
        if (data.error.includes("not the intended recipient")) {
          setShowStolenMessageModal(true);
          return;
        }
        toast.error(data.error);
        return;
      }

      if (!data?.decrypted_message) {
        throw new Error("No decrypted message returned");
      }

      setDecryptedMessage(data.decrypted_message);
      setShowWarningModal(true);
    } catch (error: any) {
      console.error("Decryption error:", error);
      toast.error(error.message || "Failed to decrypt message");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(decryptedMessage);
    toast.success("Decrypted message copied to clipboard");
  };

  const handleClear = () => {
    setEncryptedInput("");
    setDecryptedMessage("");
  };

  return (
    <Layout>
      <div className="max-w-[42rem] mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <Zap className="h-6 w-6 text-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">FastDecrypt Message</h1>
          <p className="text-muted-foreground">
            Paste the encrypted FEID message you received to decrypt it
          </p>
        </div>

        {/* Encrypted Input */}
        <Card>
          <CardHeader>
            <CardTitle>Encrypted Message</CardTitle>
            <CardDescription>
              Paste the complete FEID message (starts with "FEID:")
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste FEID:... message here..."
              value={encryptedInput}
              onChange={(e) => setEncryptedInput(e.target.value)}
              rows={6}
              className="resize-none text-sm font-mono"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleDecrypt}
                disabled={loading || !encryptedInput}
                className="gap-2"
              >
                <Unlock className="h-4 w-4" />
                {loading ? "Decrypting..." : "Decrypt"}
              </Button>
              <Button variant="outline" onClick={handleClear} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Decrypted Output */}
        <Card className={`border-success/50 ${!decryptedMessage ? "opacity-50" : ""}`}>
          <CardHeader>
            <CardTitle>Decrypted Message</CardTitle>
            <CardDescription>Your decrypted message will appear here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={decryptedMessage}
              readOnly
              rows={6}
              placeholder="Decrypted message will appear here..."
              className="resize-none text-base font-medium text-foreground"
            />
            <Button onClick={handleCopy} disabled={!decryptedMessage} className="w-full gap-2">
              <Copy className="h-4 w-4" />
              Copy to Clipboard
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-secondary/20">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>🔒 <strong>One-time decryption:</strong> Each message can only be decrypted once.</p>
              <p>📧 <strong>Recipient locked:</strong> Only the email address specified by the sender can decrypt.</p>
              <p>🚫 <strong>No message stored:</strong> The actual message is never saved on the server.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Message Decrypted Successfully</AlertDialogTitle>
            <AlertDialogDescription>
              ⚠️ This message cannot be decrypted again. Please save or copy the decrypted message now if you need it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarningModal(false)}>
              I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAlreadyDecryptedModal} onOpenChange={setShowAlreadyDecryptedModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🚫 Message Already Decrypted</AlertDialogTitle>
            <AlertDialogDescription>
              This message has already been decrypted and cannot be decrypted again. Each encrypted message can only be read once for your security.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlreadyDecryptedModal(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showStolenMessageModal} onOpenChange={setShowStolenMessageModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🔒 Unauthorized Access</AlertDialogTitle>
            <AlertDialogDescription>
              This message was not intended for you. It appears to be stolen and cannot be decrypted. Only the original intended recipient can decrypt this message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowStolenMessageModal(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
