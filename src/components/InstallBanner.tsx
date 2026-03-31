import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem("install-banner-dismissed")) {
      setDismissed(true);
      return;
    }

    // Check if running in standalone mode already
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setDismissed(true);
      return;
    }

    // Detect iOS (no beforeinstallprompt support)
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("install-banner-dismissed", "true");
  };

  // Show on Android (with prompt) or iOS (with instructions)
  if (dismissed || (!deferredPrompt && !isIOS)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 animate-fade-in">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-4 shadow-lg flex items-center gap-3">
        <img
          src="/icon-192.png"
          alt="Linkier"
          width={44}
          height={44}
          className="rounded-lg shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Install Linkier</p>
          {isIOS ? (
            <p className="text-xs text-muted-foreground">
              Tap <span className="font-medium">Share</span> then{" "}
              <span className="font-medium">Add to Home Screen</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add to your home screen for the best experience
            </p>
          )}
        </div>
        {!isIOS && (
          <Button size="sm" onClick={handleInstall} className="shrink-0">
            <Download className="h-4 w-4 mr-1" />
            Install
          </Button>
        )}
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
