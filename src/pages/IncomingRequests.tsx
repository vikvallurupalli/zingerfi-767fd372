import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Inbox, Check, X } from "lucide-react";
import { toast } from "sonner";

interface IncomingRequest {
  id: string;
  sender_id: string;
  created_at: string;
  sender_alias: string | null;
  profiles: {
    email: string;
  };
}

export default function IncomingRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<IncomingRequest | null>(null);
  const [receiverAlias, setReceiverAlias] = useState("");

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("confide_requests")
      .select(`
        id,
        sender_id,
        created_at,
        sender_alias,
        profiles!confide_requests_sender_id_fkey (
          email
        )
      `)
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load incoming requests");
      return;
    }

    setRequests(data as any || []);
  };

  const handleAcceptClick = (request: IncomingRequest) => {
    setSelectedRequest(request);
    setReceiverAlias("");
    setAcceptDialogOpen(true);
  };

  const handleAcceptConfirm = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc("accept_confide_request", {
        request_id: selectedRequest.id,
        receiver_alias: receiverAlias || null,
      });

      if (error) throw error;

      toast.success("Request accepted! You can now exchange encrypted messages.");
      setAcceptDialogOpen(false);
      setSelectedRequest(null);
      setReceiverAlias("");
      loadRequests();
    } catch (error) {
      console.error("Accept request error:", error);
      toast.error("Failed to accept request");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm("Are you sure you want to reject this request?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("confide_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request rejected");
      loadRequests();
    } catch (error) {
      toast.error("Failed to reject request");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Inbox className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Incoming Requests</h1>
          <p className="text-muted-foreground">
            Requests from others who want to add you to their confide list
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Requests ({requests.length})</CardTitle>
            <CardDescription>
              Accept or reject requests to build your confide list
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No incoming requests</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You will see requests here when someone wants to add you
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{request.profiles.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Received: {formatDate(request.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptClick(request)}
                        disabled={loading}
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
                        disabled={loading}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Request</DialogTitle>
            <DialogDescription>
              Accept request from <strong>{selectedRequest?.profiles.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="receiverAlias">Your Alias for Them (Optional)</Label>
              <Input
                id="receiverAlias"
                type="text"
                placeholder="e.g., Best Friend, Mom, Work Partner"
                value={receiverAlias}
                onChange={(e) => setReceiverAlias(e.target.value)}
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                Give them a nickname that only you will see
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAcceptDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleAcceptConfirm} disabled={loading}>
              {loading ? "Accepting..." : "Accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
