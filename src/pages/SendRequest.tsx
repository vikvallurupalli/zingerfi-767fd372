import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SendRequest() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [alias, setAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [confideCount, setConfideCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentUnlocked, setPaymentUnlocked] = useState(false);

  // Fetch confide count on mount
  useEffect(() => {
    const fetchConfideCount = async () => {
      if (!user) return;
      
      const { count, error } = await supabase
        .from("confides")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      if (!error && count !== null) {
        setConfideCount(count);
      }
      setLoadingCount(false);
    };

    fetchConfideCount();
  }, [user]);

  // Handle payment success from URL params
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success("Payment successful! You can now add another confide.");
      setPaymentUnlocked(true);
      // Clear the URL param to prevent re-triggering on refresh
      setSearchParams({}, { replace: true });
    } else if (paymentStatus === "cancelled") {
      toast.info("Payment was cancelled.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

//   const handlePayment = async () => {
//   setPaymentLoading(true);
//   try {
//     const { data, error } = await supabase.functions.invoke("create-confide-payment");
//     if (error) throw error;
    
//     // Initialize embedded checkout
//     const stripe = await stripePromise;
//     if (!stripe) throw new Error('Stripe failed to load');
    
//     const checkout = await stripe.initEmbeddedCheckout({
//       clientSecret: data.clientSecret,
//     });
    
//     // Mount checkout in the page
//     checkout.mount('#checkout-container');
    
//   } catch (error: any) {
//     console.error("Payment error:", error);
//     toast.error("Failed to initiate payment: " + (error?.message || "Unknown error"));
//   } finally {
//     setPaymentLoading(false);
//   }
// };
  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-confide-payment");
      if (error) throw error;
      if (data?.url) {
        //window.open(data.url, "_blank");
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment: " + (error?.message || "Unknown error"));
    } finally {
      setPaymentLoading(false);
    }
  };

  // Payment is required if user has 1+ confides AND hasn't just paid
  const requiresPayment = confideCount >= 1 && !paymentUnlocked;

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
        .maybeSingle();

      if (receiverError) {
        console.error("Error checking user:", receiverError);
        toast.error("Error checking user: " + receiverError.message);
        return;
      }

      if (!receiverProfile) {
        toast.error(email + ":User not found. User should have registered by logging in at least once");
        return;
      }

      // Check if already confides (both directions)
      const { data: existingConfide, error: confideCheckError } = await supabase
        .from("confides")
        .select("id")
        .or(`and(user_id.eq.${user.id},confide_user_id.eq.${receiverProfile.id}),and(user_id.eq.${receiverProfile.id},confide_user_id.eq.${user.id})`)
        .maybeSingle();

      if (confideCheckError) {
        console.error("Error checking confides:", confideCheckError);
      }

      if (existingConfide) {
        toast.error("This user is already in your confide list");
        return;
      }

      // Check if request already exists (both directions)
      const { data: existingRequest, error: requestCheckError } = await supabase
        .from("confide_requests")
        .select("id, status")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverProfile.id}),and(sender_id.eq.${receiverProfile.id},receiver_id.eq.${user.id})`)
        .maybeSingle();

      if (requestCheckError) {
        console.error("Error checking requests:", requestCheckError);
      }

      if (existingRequest) {
        if (existingRequest.status === "pending") {
          toast.error("A pending request already exists with this user");
        } else {
          toast.error("A request already exists with this user");
        }
        return;
      }

      // Create request
      const { error: requestError } = await supabase
        .from("confide_requests")
        .insert({
          sender_id: user.id,
          receiver_id: receiverProfile.id,
          status: "pending",
          sender_alias: alias || null,
        });

      if (requestError) {
        console.error("Error creating request:", requestError);
        throw requestError;
      }

      toast.success("Request sent successfully");
      setEmail("");
      setAlias("");
    } catch (error: any) {
      console.error("Send request error:", error);
      toast.error("Failed to send request: " + (error?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  if (loadingCount) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

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

        {requiresPayment ? (
          <Card className="border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Unlock Additional Confide</CardTitle>
              </div>
              <CardDescription>
                You already have {confideCount} confide{confideCount > 1 ? "s" : ""}. To add more, a one-time payment of $0.99 is required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This helps us maintain the service and ensures quality connections.
              </p>
              <Button
                onClick={handlePayment}
                disabled={paymentLoading}
                className="w-full gap-2"
              >
                {paymentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Pay $0.99 to Unlock
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>
                Enter the gmail address of the person you want to add
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address (Case sensitive)</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="alias">Alias (Optional)</Label>
                  <Input
                    id="alias"
                    type="text"
                    placeholder="e.g., Best Friend, Mom, Work Partner"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-sm text-muted-foreground">
                    Give this person a nickname that only you will see
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
        )}

        <Card className="bg-secondary/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Important Notes</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• The user must be registered on ZingerFi to receive your request</li>
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
