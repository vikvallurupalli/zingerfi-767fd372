import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Lock, Users, Smartphone, Share2, UserPlus, Mail, Key, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
// removed iphone image assets

export default function Index() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [showInstallIOS, setShowInstallIOS] = useState(false);
  const [showInstallAndroid, setShowInstallAndroid] = useState(false);
  // iphone image removed; no hover or big-image state needed

  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for the beforeinstallprompt event
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // removed hover handling for iphone image

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Zinger</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user.email}
              </span>
            )}
            <Button onClick={handleGetStarted}>
              {user ? "Go to Dashboard" : "Get Started"}
            </Button>
            {user && (
              <Button variant="outline" onClick={signOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center mb-8">
            <Button 
              variant="link" 
              onClick={() => setShowHowToUse(true)}
              className="text-lg"
            >
              How to Use Zinger →
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center sm:justify-start">

              {/* CTA Card */}
              <Card className="h-fit lg:sticky lg:top-24 w-full max-w-none sm:max-w-[220px] md:max-w-[320px] ml-0 sm:ml-6 lg:ml-8 p-6 sm:p-8">
                <CardHeader>
                  <CardTitle>Get Started</CardTitle>
                  <CardDescription>
                    Start encrypting your messages securely
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button size="lg" onClick={handleGetStarted} className="w-full gap-2">
                    <Key className="h-5 w-5" />
                    Start Encrypting
                  </Button>
                </CardContent>
              </Card>
              {/* image moved to right column to sit at the far right on the row */}

            </div>
            <div className="space-y-4 text-center sm:text-left col-span-1">
              {/* iPhone image removed as requested */}

              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">
                Secure End-to-End Encryption
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Cracking this with classical computers would take billions of years
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Install Instructions */}
      <section className="bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">


            <div className="grid md:grid-cols-2 gap-6">
              <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => setShowInstallIOS(true)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    iPhone / iPad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Click to view installation instructions →</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => setShowInstallAndroid(true)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Android
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Click to view installation instructions →</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Zinger. Secure encryption for everyone.</p>
        </div>
      </footer>

      {/* Install iOS Modal */}
      {/* big image modal removed */}

      <Dialog open={showInstallIOS} onOpenChange={setShowInstallIOS}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl">Install on iPhone / iPad</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <ol className="list-decimal list-inside space-y-4 text-sm">
              <li className="text-base">
                <span className="font-semibold">Open Zinger in Safari browser</span>
                <p className="text-muted-foreground mt-1">Launch Safari and navigate to Zinger</p>
              </li>
              <li className="text-base">
                <span className="font-semibold">Tap the Share button</span>
                <p className="text-muted-foreground mt-1">Look for the square icon with an arrow at the bottom of the screen</p>
              </li>
              <li className="text-base">
                <span className="font-semibold">Scroll down and tap "Add to Home Screen"</span>
                <p className="text-muted-foreground mt-1">You may need to scroll in the share menu to find this option</p>
              </li>
              <li className="text-base">
                <span className="font-semibold">Tap "Add" to confirm</span>
                <p className="text-muted-foreground mt-1">The app icon will appear on your home screen and work like a native app</p>
              </li>
            </ol>
          </div>
        </DialogContent>
      </Dialog>

      {/* Install Android Modal */}
      <Dialog open={showInstallAndroid} onOpenChange={setShowInstallAndroid}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl">Install on Android</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <ol className="list-decimal list-inside space-y-4 text-sm">
              <li className="text-base">
                <span className="font-semibold">Open Zinger in Chrome browser</span>
                <p className="text-muted-foreground mt-1">Launch Chrome and navigate to Zinger</p>
              </li>
              <li className="text-base">
                <span className="font-semibold">Tap the menu (three dots) in the top right</span>
                <p className="text-muted-foreground mt-1">This opens the Chrome menu options</p>
              </li>
              <li className="text-base">
                <span className="font-semibold">Tap "Add to Home screen" or "Install app"</span>
                <p className="text-muted-foreground mt-1">The exact option name may vary depending on your Chrome version</p>
              </li>
              <li className="text-base">
                <span className="font-semibold">Tap "Add" or "Install" to confirm</span>
                <p className="text-muted-foreground mt-1">You may see an install prompt automatically, or find the option in your browser menu</p>
              </li>
            </ol>
          </div>
        </DialogContent>
      </Dialog>

      {/* How to Use Modal */}
      <Dialog open={showHowToUse} onOpenChange={setShowHowToUse}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl">How to Use Zinger</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <p className="text-lg text-muted-foreground">
                Simple steps to start encrypting your messages
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Sign In with Google
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Create your account using Google OAuth. Your encryption keys are automatically generated and secured.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Add Confides
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Send confide requests to people you trust. Once accepted, you can exchange encrypted messages.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Encrypt Messages
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Type your message and select a confide. The message is encrypted locally on your device.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Share Encrypted Text
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Copy the encrypted text and send it through any channel - email, chat, SMS. Only your confide can decrypt it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}