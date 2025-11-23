import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send } from "lucide-react";
import { toast } from "sonner";

export default function SendRequest() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !user) {
      toast.error("Please enter an email address");
      return;
    }

    if (email === user.email) {
      toast.error("You cannot send a request to yourself");
      return;
    }

    setLoading(true);
    try {
      // Check if user exists
      const { data: receiverProfile, error: receiverError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (receiverError || !receiverProfile) {
        toast.error("User not found with this email address");
        return;
      }

      // Check if already confides
      const { data: existingConfide } = await supabase
        .from("confides")
        .select("id")
        .eq("user_id", user.id)
        .eq("confide_user_id", receiverProfile.id)
        .single();

      if (existingConfide) {
        toast.error("This user is already in your confide list");
        return;
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from("confide_requests")
        .select("id")
        .eq("sender_id", user.id)
        .eq("receiver_id", receiverProfile.id)
        .eq("status", "pending")
        .single();

      if (existingRequest) {
        toast.error("You already have a pending request to this user");
        return;
      }

      // Create request
      const { error: requestError } = await supabase
        .from("confide_requests")
        .insert({
          sender_id: user.id,
          receiver_id: receiverProfile.id,
          status: "pending",
        });

      if (requestError) throw requestError;

      toast.success("Request sent successfully");
      setEmail("");
    } catch (error) {
      console.error("Send request error:", error);
      toast.error("Failed to send request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Send className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Send Confide Request</h1>
          <p className="text-muted-foreground">
            Add someone to your confide list by their email
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              Enter the email address of the person you want to add
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="recipient@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  The recipient will receive a notification about your request
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full gap-2"
              >
                <Send className="h-4 w-4" />
                Send Request
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-secondary/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Important Notes</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• The user must be registered on Zinger to receive your request</li>
              <li>• No email will be sent - they will see it when they log in</li>
              <li>• Once accepted, you can exchange encrypted messages</li>
              <li>• You can view pending requests on the "Pending" page</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
