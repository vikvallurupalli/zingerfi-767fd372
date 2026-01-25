import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, CheckCircle } from "lucide-react";
import { z } from "zod";

const feedbackSchema = z.object({
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
});

export default function Feedback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = feedbackSchema.safeParse({ message });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (!user?.id || !user?.email) {
      toast({
        title: "Error",
        description: "You must be logged in to submit feedback",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        email: user.email,
        message: message.trim(),
      });

      if (error) throw error;

      setSubmitted(true);
      setMessage("");
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewFeedback = () => {
    setSubmitted(false);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Feedback & Support
          </h1>
          <p className="text-muted-foreground mt-2">
            Have a suggestion, found a bug, or need help? Let us know!
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submit Feedback</CardTitle>
            <CardDescription>
              Your feedback helps us improve ZingerFi. All submissions are reviewed by our team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
                <h3 className="text-xl font-semibold">Thank You!</h3>
                <p className="text-muted-foreground">
                  Your feedback has been submitted successfully. We appreciate you taking the time to help us improve.
                </p>
                <Button onClick={handleNewFeedback} variant="outline">
                  Submit More Feedback
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Your Message
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Describe your feedback, suggestion, or issue..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="resize-none"
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {message.length}/2000 characters
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || message.trim().length < 10}
                  className="w-full"
                >
                  {isSubmitting ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
