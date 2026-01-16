import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, Users, Smartphone, Share2, UserPlus, Mail, Key, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import iphoneImage from "@/assets/iphoneImage.png";
import logo from "@/assets/logo.png";

export default function Index() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [showInstallIOS, setShowInstallIOS] = useState(false);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

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

  const handleRegister = () => {
    sessionStorage.setItem('authMode', 'register');
    navigate("/auth");
  };

  const handleLogin = () => {
    sessionStorage.setItem('authMode', 'login');
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={logo} alt="ZingerFi Logo" className="h-12 w-12 sm:h-16 md:h-24 sm:w-16 md:w-24 rounded-xl object-contain" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ZingerFi
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
              {user ? (
                <>
                  <span className="text-xs sm:text-sm text-muted-foreground hidden md:inline px-3 py-1 bg-secondary rounded-full">
                    {user.email}
                  </span>
                  <Button onClick={handleGetStarted} size="sm" className="shadow-md hover:shadow-lg transition-shadow text-xs sm:text-sm">
                    Dashboard
                  </Button>
                  <Button variant="outline" size="sm" onClick={signOut} className="gap-1 sm:gap-2">
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleRegister} size="sm" className="shadow-md hover:shadow-lg transition-shadow gap-1 sm:gap-2 text-xs sm:text-sm">
                    <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                    Register
                  </Button>
                  <Button variant="outline" onClick={handleLogin} size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
                    Login
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          {/* Secret Caption */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            <span className="text-2xl md:text-3xl font-bold text-primary tracking-wide italic">
              Send encrypted messages to your friends and only your friend can decrypt and read it once (No more).
            </span>
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>

          {/* Main Hero Content */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Secure End-to-End Encryption
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Cracking this with classical computers would take <span className="font-bold text-primary">billions of years</span>
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Start Encrypting Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                  <Key className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Encrypt and Send</CardTitle>
                <CardDescription className="text-base">
                  Begin securing your messages now
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {user ? (
                  <Button size="lg" onClick={handleGetStarted} className="w-full gap-2 h-12 text-lg shadow-md">
                    <Lock className="h-5 w-5" />
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button size="lg" onClick={handleRegister} className="w-full gap-2 h-12 text-lg shadow-md">
                      <UserPlus className="h-5 w-5" />
                      Register
                    </Button>
                    <Button size="lg" variant="outline" onClick={handleLogin} className="w-full gap-2 h-12 text-lg">
                      <Lock className="h-5 w-5" />
                      Login
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* How to Use Card */}
            <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => setShowHowToUse(true)}>
              <CardHeader className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl">How to Use</CardTitle>
                
                <CardDescription className="text-base">
                  Learn the simple 4-step process
                </CardDescription>
                
              </CardHeader>
              <CardContent>
                <Button size="lg" variant="outline" className="w-full gap-2 h-12 text-lg">
                  <Share2 className="h-5 w-5" />
                  View Guide →
                </Button>
              </CardContent>
            </Card>
 {/* Install App Card */}
            <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer md:col-span-2 lg:col-span-1" onClick={() => setShowInstallIOS(true)}>
              <CardHeader className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-success/20 flex items-center justify-center mb-4">
                  <Smartphone className="h-8 w-8 text-success" />
                </div>
                <CardTitle className="text-2xl">Install App</CardTitle>
                
                <CardDescription className="text-base">
                  iPhone, iPad & Android supported
                </CardDescription>
                
              </CardHeader>
              <CardContent>
                <Button size="lg" variant="secondary" className="w-full gap-2 h-12 text-lg">
                  <Smartphone className="h-5 w-5" />
                  View Instructions
                </Button>
              </CardContent>
            </Card>
           
          </div>

          {/* iPhone Mockup */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-3xl rounded-full opacity-50"></div>
              <img 
                src={iphoneImage} 
                alt="iPhone showing encrypted message" 
                className="relative w-full max-w-md h-auto shadow-2xl rounded-3xl"
              />

            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 ZingerFi. Secure encryption for everyone.</p>
        </div>
      </footer>

      {/* Install iOS Modal */}
      <Dialog open={showInstallIOS} onOpenChange={setShowInstallIOS}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl">Install on iPhone / iPad / Android</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <section>
              <h3 className="text-xl font-semibold mb-2">iPhone / iPad (Safari)</h3>
              <ol className="list-decimal list-inside space-y-4 text-sm">
                <li className="text-base">
                  <span className="font-semibold">Open ZingerFi in Safari browser</span>
                  <p className="text-muted-foreground mt-1">Launch your favorite browser and navigate to ZingerFi</p>
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
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-2">Android (Chrome)</h3>
              <ol className="list-decimal list-inside space-y-4 text-sm">
                <li className="text-base">
                  <span className="font-semibold">Open ZingerFi in Chrome browser</span>
                  <p className="text-muted-foreground mt-1">Launch Chrome and navigate to ZingerFi</p>
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
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* How to Use Modal */}
      <Dialog open={showHowToUse} onOpenChange={setShowHowToUse}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl">How to Use ZingerFi</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <p className="text-lg text-muted-foreground">
                Simple steps to start encrypting your messages
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
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
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
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
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
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
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
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
