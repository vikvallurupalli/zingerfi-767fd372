import { useState, useEffect } from "react";

interface PWADetection {
  isPWA: boolean;
  isBrowser: boolean;
  displayMode: "standalone" | "browser" | "minimal-ui" | "fullscreen";
  isIOS: boolean;
  isAndroid: boolean;
}

export function usePWADetection(): PWADetection {
  const [detection, setDetection] = useState<PWADetection>({
    isPWA: false,
    isBrowser: true,
    displayMode: "browser",
    isIOS: false,
    isAndroid: false,
  });

  useEffect(() => {
    const checkDisplayMode = () => {
      // Check for iOS standalone mode
      const isIOSStandalone = (window.navigator as any).standalone === true;
      
      // Check for display-mode media queries
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isMinimalUI = window.matchMedia("(display-mode: minimal-ui)").matches;
      const isFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
      
      // Detect platform
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      
      // Determine display mode
      let displayMode: PWADetection["displayMode"] = "browser";
      if (isFullscreen) displayMode = "fullscreen";
      else if (isStandalone || isIOSStandalone) displayMode = "standalone";
      else if (isMinimalUI) displayMode = "minimal-ui";
      
      const isPWA = isStandalone || isIOSStandalone || isMinimalUI || isFullscreen;
      
      setDetection({
        isPWA,
        isBrowser: !isPWA,
        displayMode,
        isIOS,
        isAndroid,
      });
    };

    checkDisplayMode();

    // Listen for display mode changes
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const minimalUIQuery = window.matchMedia("(display-mode: minimal-ui)");
    const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)");

    standaloneQuery.addEventListener("change", checkDisplayMode);
    minimalUIQuery.addEventListener("change", checkDisplayMode);
    fullscreenQuery.addEventListener("change", checkDisplayMode);

    return () => {
      standaloneQuery.removeEventListener("change", checkDisplayMode);
      minimalUIQuery.removeEventListener("change", checkDisplayMode);
      fullscreenQuery.removeEventListener("change", checkDisplayMode);
    };
  }, []);

  return detection;
}
