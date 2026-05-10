import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "YOS Fitness Studio — Coaching-Focused Gym in Mylapore, Chennai",
    template: "%s | YOS Fitness Studio",
  },
  description:
    "Train with proper guidance at YOS Fitness Studio in Mylapore, Chennai. Personal training, semi-private coaching, fat loss programs, and strength training for all fitness levels.",
  keywords: [
    "gym in Mylapore",
    "fitness studio Mylapore",
    "personal training Mylapore",
    "weight loss gym Chennai",
    "strength training Mylapore",
    "best gym near Mylapore",
    "semi private personal training Chennai",
    "YOS Fitness Studio",
    "gym near Mandaveli",
    "gym near Santhome",
    "beginner gym Mylapore",
    "coaching gym Chennai",
  ],
  authors: [{ name: "YOS Fitness Studio" }],
  creator: "YOS Fitness Studio",
  metadataBase: new URL("https://www.yosfitness.in"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "YOS Fitness Studio — Coaching-Focused Gym in Mylapore, Chennai",
    description:
      "Build strength, lose fat, and train with proper coaching at YOS Fitness Studio in Mylapore, Chennai. Beginner-friendly. Personal training & semi-private coaching available.",
    url: "https://www.yosfitness.in",
    siteName: "YOS Fitness Studio",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "YOS Fitness Studio — Gym in Mylapore, Chennai",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YOS Fitness Studio — Gym in Mylapore, Chennai",
    description:
      "Build strength, lose fat, and train with proper coaching at YOS Fitness Studio in Mylapore, Chennai.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
