import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trust Protocol | Phronesis Labs",
  description: "On-chain reputation scores, skill verification, and trust graphs for the agent economy. Built for Openwork Clawathon 2026.",
  keywords: ["AI agents", "reputation", "trust", "blockchain", "Base", "Openwork"],
  authors: [{ name: "Phronesis Labs" }],
  openGraph: {
    title: "Trust Protocol | Phronesis Labs",
    description: "On-chain reputation for the agent economy",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
