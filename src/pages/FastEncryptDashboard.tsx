import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Lock, Unlock, Zap, Send, CheckCircle, Clock, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessageRecord {
  id: string;
  message_uid: string;
  recipient_email: string;
  is_decrypted: boolean;
  created_at: string;
  decrypted_at: string | null;
}

export default function FastEncryptDashboard() {
  const { user } = useAuth();
  const [sentMessages, setSentMessages] = useState<MessageRecord[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMessages();
    }
  }, [user]);

  const loadMessages = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load sent messages
      const { data: sent, error: sentErr } = await supabase
        .from("fast_encrypt_messages" as any)
        .select("id, message_uid, recipient_email, is_decrypted, created_at, decrypted_at")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (sentErr) {
        console.error("Error loading sent messages:", sentErr);
      } else {
        setSentMessages((sent as any) || []);
      }

      // Load received messages (where recipient_email matches user email)
      const { data: received, error: recvErr } = await supabase
        .from("fast_encrypt_messages" as any)
        .select("id, message_uid, recipient_email, is_decrypted, created_at, decrypted_at")
        .eq("recipient_email", user.email)
        .order("created_at", { ascending: false })
        .limit(20);

      if (recvErr) {
        console.error("Error loading received messages:", recvErr);
      } else {
        setReceivedMessages((received as any) || []);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold">FastEncrypt</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Quick encryption using a shared system key. Encrypt for any email — no confide setup needed. One-time decryption ensures message security.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-3 grid-cols-2 max-w-sm mx-auto">
          <Link to="/fast-encrypt">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                <Lock className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold">Encrypt</span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/fast-decrypt">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                <Unlock className="h-6 w-6 text-accent" />
                <span className="text-sm font-semibold">Decrypt</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* How It Works */}
        <Card className="bg-secondary/20">
          <CardHeader>
            <CardTitle>How FastEncrypt Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h3 className="font-semibold mb-2">1. Encrypt for Any Email</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the recipient's email and your message. Encryption happens instantly using the system key.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2. Share the Encrypted Text</h3>
                <p className="text-sm text-muted-foreground">
                  Copy and send the encrypted payload via any channel — email, SMS, chat, etc.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3. Recipient Decrypts Once</h3>
                <p className="text-sm text-muted-foreground">
                  Only the intended recipient (by email) can decrypt it, and only once. Messages are never stored on the server.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message History */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sent Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Sent Messages
              </CardTitle>
              <CardDescription>Messages you've encrypted and sent</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : sentMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages sent yet.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {sentMessages.map((msg) => (
                    <div key={msg.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{msg.recipient_email}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</p>
                      </div>
                      <Badge variant={msg.is_decrypted ? "default" : "secondary"}>
                        {msg.is_decrypted ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Read
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Received Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Unlock className="h-5 w-5" />
                Received Messages
              </CardTitle>
              <CardDescription>Messages encrypted for your email</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : receivedMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages received yet.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {receivedMessages.map((msg) => (
                    <div key={msg.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</p>
                        <p className="text-xs font-mono text-muted-foreground">
                          ID: {msg.message_uid.substring(0, 8)}...
                        </p>
                      </div>
                      <Badge variant={msg.is_decrypted ? "default" : "secondary"}>
                        {msg.is_decrypted ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Decrypted
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Awaiting
                          </span>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
