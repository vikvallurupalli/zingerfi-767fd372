import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, EyeOff, Timer, X } from "lucide-react";

const features = [
  {
    title: "Military-grade encryption",
    description: "Your messages are unreadable to anyone except your recipient",
    icon: Shield,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "No middleman",
    description: "We can't read your messages. True privacy.",
    icon: EyeOff,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "One time read",
    description: "Encrypted message gets invalidated after first read.",
    icon: Timer,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

export function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Show popup on first visit (check sessionStorage to avoid showing repeatedly in same session)
    const hasSeenPopup = sessionStorage.getItem("hasSeenWelcomePopup");
    if (!hasSeenPopup) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % features.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("hasSeenWelcomePopup", "true");
  };

  const currentFeature = features[currentIndex];
  const Icon = currentFeature.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-primary/20">
        <div className="relative">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-3 top-3 z-10 rounded-full p-1.5 bg-background/80 hover:bg-background transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background px-6 pt-8 pb-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center">
                Welcome to ZingerFi 🔐
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Secure messaging made simple
            </p>
          </div>

          {/* Rotating feature display */}
          <div className="px-6 py-6">
            <div
              className={`flex flex-col items-center text-center transition-all duration-300 ${
                isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
              }`}
            >
              <div className={`p-4 rounded-full ${currentFeature.bgColor} mb-4`}>
                <Icon className={`h-8 w-8 ${currentFeature.iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{currentFeature.title}</h3>
              <p className="text-sm text-muted-foreground">{currentFeature.description}</p>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {features.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-primary w-4"
                      : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="px-6 pb-6">
            <Button onClick={handleClose} className="w-full">
              Got it!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
