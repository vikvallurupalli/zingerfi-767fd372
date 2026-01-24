import { useState, useEffect } from "react";
import { Shield, Eye, Clock } from "lucide-react";

const features = [
  {
    title: "Military-grade encryption",
    description: "Your messages are unreadable to anyone except your recipient",
    icon: Shield,
  },
  {
    title: "No middleman",
    description: "We can't read your messages. True privacy.",
    icon: Eye,
  },
  {
    title: "One time read",
    description: "Encrypted message gets invalidated after first read.",
    icon: Clock,
  },
];

export function RotatingFeatureCard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % features.length);
        setIsAnimating(false);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const currentFeature = features[currentIndex];
  const Icon = currentFeature.icon;

  return (
    <div className="mb-4 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 max-w-xs">
      <div
        className={`flex items-start gap-2 transition-all duration-300 ${
          isAnimating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
        }`}
      >
        <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-primary">{currentFeature.title}</p>
          <p className="text-xs text-muted-foreground leading-tight">{currentFeature.description}</p>
        </div>
      </div>
    </div>
  );
}
