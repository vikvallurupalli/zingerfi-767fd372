import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, X } from "lucide-react";
import { toast } from "sonner";

interface PendingRequest {
  id: string;
  created_at: string;
  profiles: {
    email: string;
  };
}

export default function PendingRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("confide_requests")
      .select(`
        id,
        created_at,
        profiles!confide_requests_receiver_id_fkey (
          email
        )
      `)
      .eq("sender_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load pending requests");
      return;
    }

    setRequests(data as any || []);
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this request?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("confide_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request cancelled");
      loadRequests();
    } catch (error) {
      toast.error("Failed to cancel request");
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
              <Clock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Pending Requests</h1>
          <p className="text-muted-foreground">
            Requests you have sent that are awaiting response
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Outgoing Requests ({requests.length})</CardTitle>
            <CardDescription>
              These users have not yet accepted your request
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending requests</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Send a request to add someone to your confide list
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
                        Sent: {formatDate(request.created_at)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancel(request.id)}
                      disabled={loading}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
