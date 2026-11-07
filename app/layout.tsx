import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./premium.css";
import "./personal.css";
import "./typography.css";
import "./opening-animation.css";
import IntroController from "./intro-controller";
const sora = localFont({
  src: "./fonts/Sora-Variable.ttf",
  variable: "--font-brand",
  weight: "100 800",
  display: "swap",
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
});
const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.ttf",
  variable: "--font-ui",
  weight: "200 800",
  display: "swap",
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
});
export const metadata: Metadata = {
  title: "PAKKA · Every promise, remembered",
  icons: { icon: "/pakka-mark.svg" },
  description: "A little clarity for the money between people.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${jakarta.variable}`}>
      <body>
        <IntroController />
        {children}
      </body>
    </html>
  );
}
