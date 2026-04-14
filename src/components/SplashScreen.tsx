import { useEffect, useState } from "react";
import landingBg from "@/assets/landing-background.jpg";

interface SplashScreenProps {
  onFinished: () => void;
}

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 3500);
    const finishTimer = setTimeout(() => onFinished(), 4000);
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      <div className="relative z-10 flex flex-col items-center justify-center">
        <h1 className="animate-fade-in text-5xl font-extrabold tracking-tight text-white">
          Linkier
        </h1>
        <p
          className="text-white/70 text-sm tracking-wide animate-fade-in mt-2"
          style={{ animationDelay: "0.2s", animationFillMode: "both" }}
        >
          Student housing made easy
        </p>
      </div>
    </div>
  );
}
