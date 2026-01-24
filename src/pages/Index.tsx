import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Lock, Users, Smartphone, Share2, UserPlus, Mail, Key, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import sendImage from "@/assets/send.jpg";
import smsImage from "@/assets/sms.jpg";
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
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Action Buttons Row with iPhone */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8 mb-8">
            {/* Image Carousel - Left Side */}
            <div className="relative w-32 md:w-48 lg:w-56 flex-shrink-0">
              <Carousel 
                opts={{ loop: true }} 
                plugins={[Autoplay({ delay: 3000, stopOnInteraction: false })]}
                className="w-full"
              >
                <CarouselContent>
                  <CarouselItem>
                    <img 
                      src={sendImage} 
                      alt="Encrypt message screen" 
                      className="w-full h-auto shadow-xl rounded-xl"
                    />
                  </CarouselItem>
                  <CarouselItem>
                    <img 
                      src={smsImage} 
                      alt="Send encrypted message via SMS" 
                      className="w-full h-auto shadow-xl rounded-xl"
                    />
                  </CarouselItem>
                </CarouselContent>
              </Carousel>
            </div>

            {/* Buttons */}
            {user ? (
              <Button onClick={handleGetStarted} className="gap-2 shadow-md">
                <Lock className="h-4 w-4" />
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button onClick={handleRegister} className="gap-2 shadow-md">
                  <UserPlus className="h-4 w-4" />
                  Register
                </Button>
                <Button variant="outline" onClick={handleLogin} className="gap-2">
                  <Lock className="h-4 w-4" />
                  Login
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={() => setShowHowToUse(true)} className="gap-2">
              <Share2 className="h-4 w-4" />
              View Guide
            </Button>
            <Button variant="secondary" onClick={() => setShowInstallIOS(true)} className="gap-2">
              <Smartphone className="h-4 w-4" />
              Phone App Instructions
            </Button>
          </div>

          {/* Main Hero Content */}
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Send messages only your recipient can read.
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Cracking this with classical computers would take <span className="font-bold text-primary">billions of years</span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground space-y-2">
          <p>&copy; 2025 ZingerFi. Secure encryption for everyone.</p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/privacy-policy" className="text-sm hover:text-primary transition-colors underline">
              Privacy Policy
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link to="/terms-of-service" className="text-sm hover:text-primary transition-colors underline">
              Terms of Service
            </Link>
          </div>
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
