import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { FeedbackButton } from "@/components/feedback-button";
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
  title: "CardTool - Optimize Your Credit Card Rewards",
  description:
    "Track 100+ credit cards and see which one earns the most for every purchase. Optimize your spending across 30+ categories.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "CardTool - Credit Card Rewards Optimizer",
    description:
      "See exactly which card earns you the most for every purchase.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  return (
    <html lang="en" className="dark bg-zinc-950">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 min-h-screen`}
      >
        <ClerkProvider>
          {children}
          {userId && <FeedbackButton />}
        </ClerkProvider>
      </body>
    </html>
  );
}
