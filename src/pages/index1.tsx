import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Users, Smartphone, Share2, UserPlus, Mail, Key, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import iphoneImage from "@/assets/iphone-encrypted-message.png";

export default function Index() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

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
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center lg:justify-start">
              <img 
                src={iphoneImage} 
                alt="iPhone showing encrypted message" 
                className="w-64 h-auto object-contain"
              />
            </div>
            <div className="space-y-6 text-center lg:text-left">
              <h2 className="text-5xl font-bold tracking-tight">
                Secure End-to-End Encryption
              </h2>
              <p className="text-xl text-muted-foreground">
                Share encrypted messages with confidence. Your privacy, your control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Use + CTA Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-[2fr,1fr] gap-8">
              {/* How to Use */}
              <div>
                <div className="mb-8">
                  <h3 className="text-3xl font-bold mb-4">How to Use Zinger</h3>
                  <p className="text-lg text-muted-foreground">
                    Simple steps to start encrypting your messages
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
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
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
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
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
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
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
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

              {/* CTA Card */}
              <Card className="h-fit sticky top-24">
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
                  {isInstallable && !isIOS && (
                    <Button size="lg" variant="outline" onClick={handleInstall} className="w-full gap-2">
                      <Smartphone className="h-5 w-5" />
                      Install App
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold mb-4">About Zinger</h3>
              <p className="text-lg text-muted-foreground">
                A secure encryption tool designed for privacy-conscious users
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Lock className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>End-to-End Encrypted</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Your messages are encrypted using ECC-256 cryptography. Only you and your confides can read them.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>No Message Storage</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    We don't store your messages. Encrypt locally, share externally, and decrypt on your device.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Confide Network</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Build your trusted network of confides. Only exchange encrypted messages with approved contacts.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Install Instructions */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold mb-4">Install Zinger as an App</h3>
              <p className="text-lg text-muted-foreground">
                Get quick access by installing Zinger on your device
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    iPhone / iPad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Open Zinger in Safari browser</li>
                    <li>Tap the Share button (square with arrow)</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add" to confirm</li>
                  </ol>
                  <p className="text-xs text-muted-foreground pt-2">
                    The app icon will appear on your home screen and work like a native app.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Android
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Open Zinger in Chrome browser</li>
                    <li>Tap the menu (three dots) in the top right</li>
                    <li>Tap "Add to Home screen" or "Install app"</li>
                    <li>Tap "Add" or "Install" to confirm</li>
                  </ol>
                  <p className="text-xs text-muted-foreground pt-2">
                    You'll see an install prompt, or find the option in your browser menu.
                  </p>
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
    </div>
  );
}
