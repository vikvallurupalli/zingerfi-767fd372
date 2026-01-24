import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SafariImage from "@/assets/SafariAddToHomeScreen.png";
import ChromeImage from "@/assets/ChromeAddToHomeScreen.png";

interface AddToHomeScreenPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToHomeScreenPopup({ open, onOpenChange }: AddToHomeScreenPopupProps) {
  const [browserType, setBrowserType] = useState<"safari" | "chrome">("chrome");

  useEffect(() => {
    // Detect browser type
    const userAgent = navigator.userAgent.toLowerCase();
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent) && !/chromium/.test(userAgent);
    setBrowserType(isSafari ? "safari" : "chrome");
  }, []);

  const imageToShow = browserType === "safari" ? SafariImage : ChromeImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Home Screen</DialogTitle>
          <DialogDescription>
            For ease of use, save the app to home screen like shown here.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <img 
            src={imageToShow} 
            alt={`Add to home screen instructions for ${browserType === "safari" ? "Safari" : "Chrome"}`}
            className="max-w-full h-auto rounded-lg border shadow-sm max-h-[60vh] object-contain"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
