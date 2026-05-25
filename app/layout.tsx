import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yos Fitness",
  },
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
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Apple touch icons — required for iPhone "Add to Home Screen" */}
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <meta name="theme-color" content="#f97316" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </body>
    </html>
  );
}
