import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock, Unlock, Users, Send, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { user } = useAuth();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");

  useEffect(() => {
    const checkAuthMode = async () => {
      const authMode = sessionStorage.getItem('authMode');
      
      // Only show popup if coming from Register button
      if (authMode === 'register' && user) {
        sessionStorage.removeItem('authMode');
        
        // Check if user was created recently (within 30 seconds)
        const { data: profile } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          const createdAt = new Date(profile.created_at);
          const now = new Date();
          const diffInSeconds = (now.getTime() - createdAt.getTime()) / 1000;
          
          if (diffInSeconds < 30) {
            setWelcomeMessage("You have registered successfully. Enjoy encrypting.");
          } else {
            setWelcomeMessage("You are an already registered user. Enjoy encrypting.");
          }
          setShowWelcomeModal(true);
        }
      } else if (authMode) {
        // Clean up authMode for login (no popup shown)
        sessionStorage.removeItem('authMode');
      }
    };

    checkAuthMode();
  }, [user]);

  return (
    <>
      <AlertDialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Welcome to ZingerFi!</AlertDialogTitle>
            <AlertDialogDescription>
              {welcomeMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWelcomeModal(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    <Layout>
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold">ZingerFi Encryption Tool</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Secure end-to-end encryption using ECC-256. Encrypt messages for your trusted confides and decrypt messages you receive.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Lock className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Encrypt Message</CardTitle>
              <CardDescription>
                Encrypt a message using a confide's public key
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/encrypt">
                <Button className="w-full">Start Encrypting</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Unlock className="h-8 w-8 text-accent mb-2" />
              <CardTitle>Decrypt Message</CardTitle>
              <CardDescription>
                Decrypt a message using your private key
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/decrypt">
                <Button variant="outline" className="w-full">Start Decrypting</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Confides</CardTitle>
              <CardDescription>
                Manage your trusted confide list
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/confides">
                <Button variant="outline" className="w-full">View Confides</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Send className="h-8 w-8 text-accent mb-2" />
              <CardTitle>Request a Confide</CardTitle>
              <CardDescription>
                Add someone new to your confide list
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/send-request">
                <Button variant="outline" className="w-full">Send Request</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-secondary/20">
          <CardHeader>
            <CardTitle>How ZingerFi Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h3 className="font-semibold mb-2">1. Build Your Confide List</h3>
                <p className="text-sm text-muted-foreground">
                  Send requests to people you trust. Once they accept, you can encrypt messages for them.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2. Encrypt Messages</h3>
                <p className="text-sm text-muted-foreground">
                  Select a confide and encrypt your message. Copy the encrypted text and send it via any channel.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3. Decrypt Received Messages</h3>
                <p className="text-sm text-muted-foreground">
                  Paste encrypted text you receive and decrypt it instantly using your private key.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
    </>
  );
}
