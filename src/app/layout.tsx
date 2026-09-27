import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { platformUrl } from "@/lib/tenant";
import "./globals.css";

// Atkinson Hyperlegible Next (SIL Open Font License), self-hosted: no third-party font requests.
const atkinson = localFont({
  // Upright only: the interface uses no italics, so the italic file (37 KB) is not downloaded.
  src: [{ path: "../fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(platformUrl("/")),
  title: {
    default: "NotifyHub: digital notice boards for colleges",
    template: "%s | NotifyHub",
  },
  description:
    "NotifyHub gives every college its own announcement portal. Students open one address to see notices, exam schedules, placements and events. No sign-in needed.",
};

export const viewport: Viewport = {
  themeColor: "#12233a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={atkinson.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
