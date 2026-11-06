import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PAKKA · Every promise, remembered",
  description: "A little clarity for the money between people.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
