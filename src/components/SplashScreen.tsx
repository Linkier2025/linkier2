import { useEffect, useState } from "react";
import landingBg from "@/assets/landing-background.jpg";

interface SplashScreenProps {
  onFinished: () => void;
}

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 1500);
    const finishTimer = setTimeout(() => onFinished(), 2000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinished]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundImage: `url(${landingBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Icon */}
        <div className="animate-scale-in mb-6">
          <img
            src="/app-icon.png"
            alt="Linkier"
            width={96}
            height={96}
            className="rounded-2xl shadow-lg"
          />
        </div>

        {/* App Name */}
        <h1 className="animate-fade-in text-4xl font-bold tracking-tight text-white mb-2">
          Linkier
        </h1>

        {/* Tagline */}
        <p
          className="text-white/80 text-sm tracking-wide animate-fade-in"
          style={{ animationDelay: "0.2s", animationFillMode: "both" }}
        >
          Student housing made easy
        </p>
      </div>
    </div>
  );
}
