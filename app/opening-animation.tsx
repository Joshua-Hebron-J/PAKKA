"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import IntroHandshake from "./intro-handshake";

/** A bounded, decorative document intro; never a data-loading or input gate. */
export default function OpeningAnimation() {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (dismissed) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dismiss = () => setDismissed(true);
    const timeout = window.setTimeout(dismiss, motion.matches ? 180 : 2850);
    window.addEventListener("pointerdown", dismiss, {
      once: true,
      capture: true,
      passive: true,
    });
    window.addEventListener("keydown", dismiss, { once: true, capture: true });
    motion.addEventListener("change", dismiss);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pointerdown", dismiss, true);
      window.removeEventListener("keydown", dismiss, true);
      motion.removeEventListener("change", dismiss);
    };
  }, [dismissed]);
  if (dismissed) return null;
  return (
    <div
      className="pakka-opening"
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setDismissed(true);
      }}
    >
      <div className="intro-light" />
      <div className="intro-orbit">
        <i />
      </div>
      <div className="opening-lockup">
        <div className="opening-scene">
          <div className="intro-contact-shadow" />
          <IntroHandshake />
          <div className="opening-mark">
            <Image
              src="/pakka-mark.svg"
              width={104}
              height={114}
              alt=""
              priority
              onError={() => setDismissed(true)}
            />
          </div>
        </div>
        <div className="opening-wordmark">PAKKA</div>
        <p className="opening-tagline">
          Every Rupee. Every Promise. Remembered.
        </p>
        <div className="intro-features">
          <span>Track Agreements</span>
          <span>Manage Your Money</span>
          <span>Grow Your Savings</span>
          <span>AI Money Coach</span>
        </div>
      </div>
    </div>
  );
}
