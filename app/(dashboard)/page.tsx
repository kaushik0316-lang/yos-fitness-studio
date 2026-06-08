import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Phone, Clock, Dumbbell, Users, Target,
  Zap, Flame, CheckCircle2, ArrowRight, Award,
  Shield, Activity, BarChart2, MessageCircle, ChevronDown,
} from "lucide-react";
import { MobileNav } from "@/components/layout/MobileNav";

// ── Contact & domain constants ───────────────────────────────────────────────
const PHONE_DISPLAY = "+91 98406 90418";
const PHONE_TEL = "+919840690418";
const WHATSAPP_NUMBER = "919840690418";
const SITE_URL = "https://yosfitnessstudio.in";
const WA_ENQUIRY =
  "Hi%20Yos%20Fitness%20Studio!%20I%20would%20like%20to%20enquire%20about%20membership.";
const WA_SEMI_PRIVATE =
  "Hi%20Yos%20Fitness%20Studio!%20I%20would%20like%20to%20know%20more%20about%20semi-private%20coaching.";

// ── Google Business Profile ──────────────────────────────────────────────────
const GMAPS_EMBED_SRC =
  "https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3887.0132637401985!2d80.26869107454756!3d13.034827213489963!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTPCsDAyJzA1LjQiTiA4MMKwMTYnMTYuNiJF!5e0!3m2!1sen!2sin!4v1778377588499!5m2!1sen!2sin";
const GBP_PROFILE_URL = "https://maps.app.goo.gl/rDUREt3pHRpgcC649";
const GOOGLE_REVIEW_URL = "https://g.page/r/CfPmKe5IdqqCEBM/review";

// ── Address ──────────────────────────────────────────────────────────────────
const STREET_ADDRESS = "1st & 2nd Floor, Old No. 54 & 55, New No. 107 & 109, Kutchery Road";
const ADDRESS_SHORT = "107 & 109, Kutchery Road, Mylapore — 600 004";

// ── Opening hours ────────────────────────────────────────────────────────────
const HOURS_WEEKDAY = "Mon – Sat: 6:00 AM – 12:00 PM and 4:00 PM – 9:30 PM";
const HOURS_SUNDAY = "Sunday: 8:00 AM – 11:00 AM";
const HOURS_INLINE = "Mon–Sat: 6:00 AM–12:00 PM & 4:00–9:30 PM\u00a0|\u00a0Sun: 8:00–11:00 AM";

export const metadata: Metadata = {
  title: "Yos Fitness Studio — Friendly Neighbourhood Gym in Mylapore, Chennai",
  description:
    "Yos Fitness Studio is your friendly neighbourhood gym in Mylapore, Chennai. Semi-private coaching, personal training, weight loss, and strength programmes. Coaches who know your name. Call +91 98406 90418.",
  keywords: [
    "gym in Mylapore",
    "friendly gym Mylapore",
    "neighbourhood gym Mylapore",
    "semi-private coaching Mylapore",
    "semi-private coaching Chennai",
    "personal training Mylapore",
    "weight loss gym Mylapore",
    "strength training Mylapore",
    "best gym Mylapore",
    "YOS Fitness Studio",
    "Yos Fitness Studio",
    "gym near Mandaveli",
    "gym near Santhome",
    "beginner gym Mylapore",
    "coaching gym Chennai",
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Yos Fitness Studio — Friendly Neighbourhood Gym in Mylapore, Chennai",
    description:
      "Your friendly neighbourhood gym in Mylapore. Semi-private coaching, personal training, fat loss, and strength — with coaches who know your name.",
    url: SITE_URL,
    siteName: "Yos Fitness Studio",
    locale: "en_IN",
    type: "website",
    images: [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630, alt: "Yos Fitness Studio — Neighbourhood Gym in Mylapore, Chennai" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yos Fitness Studio — Gym in Mylapore, Chennai",
    description: "Your friendly neighbourhood gym in Mylapore. Semi-private coaching, personal training, fat loss, and strength.",
    images: [`${SITE_URL}/og-image.jpg`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};

// ── LocalBusiness schema ─────────────────────────────────────────────────────
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["HealthClub", "LocalBusiness"],
  name: "Yos Fitness Studio",
  description:
    "Friendly neighbourhood gym in Mylapore, Chennai offering semi-private coaching, personal training, fat loss programmes, and strength training. Coaches who know members personally.",
  url: SITE_URL,
  telephone: PHONE_DISPLAY,
  address: {
    "@type": "PostalAddress",
    streetAddress: STREET_ADDRESS,
    addressLocality: "Mylapore",
    addressRegion: "Tamil Nadu",
    postalCode: "600004",
    addressCountry: "IN",
  },
  geo: { "@type": "GeoCoordinates", latitude: "13.0347589", longitude: "80.2713245" },
  sameAs: [GBP_PROFILE_URL],
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], opens: "06:00", closes: "12:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], opens: "16:00", closes: "21:30" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday"], opens: "08:00", closes: "11:00" },
  ],
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Semi-Private Coaching", value: true },
    { "@type": "LocationFeatureSpecification", name: "Personal Training", value: true },
    { "@type": "LocationFeatureSpecification", name: "Strength Training Equipment", value: true },
    { "@type": "LocationFeatureSpecification", name: "Body Composition Analysis", value: true },
    { "@type": "LocationFeatureSpecification", name: "Beginner-Friendly Coaching", value: true },
    { "@type": "LocationFeatureSpecification", name: "Weight Loss Programme", value: true },
  ],
  priceRange: "₹₹",
  areaServed: [
    { "@type": "City", name: "Mylapore" },
    { "@type": "City", name: "Mandaveli" },
    { "@type": "City", name: "Alwarpet" },
    { "@type": "City", name: "Santhome" },
    { "@type": "City", name: "Luz" },
    { "@type": "City", name: "Royapettah" },
    { "@type": "City", name: "Triplicane" },
  ],
};

// ── FAQ schema ───────────────────────────────────────────────────────────────
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Yos Fitness Studio beginner-friendly?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Yos Fitness Studio in Mylapore is specifically built to be welcoming for beginners. Every new member receives proper coaching from day one — structured workout guidance, technique correction, and a supportive environment where you never feel lost or intimidated. Our coaches are genuinely involved in your sessions, not just present in the room." },
    },
    {
      "@type": "Question",
      name: "What makes Yos different from a large commercial gym?",
      acceptedAnswer: { "@type": "Answer", text: "Yos Fitness Studio is a friendly neighbourhood gym — not a large commercial chain. Our coaches know members by name and are actively involved in every session. We offer semi-private coaching (maximum 4 members per slot), structured workout plans, and the kind of personal attention that is rare in a big gym environment." },
    },
    {
      "@type": "Question",
      name: "What is semi-private coaching at Yos Fitness Studio?",
      acceptedAnswer: { "@type": "Answer", text: "Semi-private coaching at Yos Fitness Studio is a small-group training format with a maximum of 4 members per session. A dedicated coach leads every session — giving each member proper technique guidance, form correction, and a structured workout. It delivers the coaching quality of personal training at a more accessible price." },
    },
    {
      "@type": "Question",
      name: "Is semi-private coaching better than general gym training?",
      acceptedAnswer: { "@type": "Answer", text: "For most people, yes. With semi-private coaching at Yos, you receive structured workouts, form correction, and a coach who tracks your progress — rather than training alone on the gym floor without guidance. The small group size (max 4) ensures you get real attention in every session." },
    },
    {
      "@type": "Question",
      name: "Can I visit Yos Fitness Studio before joining?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. You are welcome to walk in and see the studio in Mylapore. We recommend calling or sending a WhatsApp message to +91 98406 90418 before visiting so the team can be available to show you around and answer your questions." },
    },
    {
      "@type": "Question",
      name: "Do you offer personal attention during workouts at Yos?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. At Yos Fitness Studio, coaches are actively involved in sessions — not just supervising from a distance. Whether you join as a personal training member or a semi-private coaching member, your coach provides technique feedback, tracks your progress, and adjusts your programme as you improve." },
    },
    {
      "@type": "Question",
      name: "What are the opening hours of Yos Fitness Studio?",
      acceptedAnswer: { "@type": "Answer", text: "Yos Fitness Studio in Mylapore is open Monday to Saturday from 6:00 AM to 12:00 PM and 4:00 PM to 9:30 PM. On Sundays the studio is open from 8:00 AM to 11:00 AM." },
    },
    {
      "@type": "Question",
      name: "Which areas is Yos Fitness Studio near?",
      acceptedAnswer: { "@type": "Answer", text: "Yos Fitness Studio is located at 1st & 2nd Floor, Old No. 54 & 55, New No. 107 & 109, Kutchery Road, Mylapore, Chennai — 600 004. Members come from nearby areas including Mandaveli, Alwarpet, Santhome, Luz, Royapettah, and Triplicane." },
    },
  ],
};

const services = [
  {
    icon: Zap,
    title: "Semi-Private Coaching",
    desc: "Train in a small group of up to 4 people with a dedicated coach. Every session is structured, every member gets real attention. The best of personal coaching at an accessible price.",
    tag: "Max 4 per slot",
    href: "/semi-private-coaching-chennai",
  },
  {
    icon: Users,
    title: "Personal Training",
    desc: "One-on-one sessions with your own coach. Fully customised programme, technique correction, and complete accountability — built around your specific goal.",
    tag: "1-on-1",
    href: "/personal-training-mylapore",
  },
  {
    icon: Flame,
    title: "Weight Loss Training",
    desc: "Structured fat loss programmes combining resistance training, cardio guidance, and practical nutrition awareness. Sustainable results through consistent coached training.",
    tag: "Fat loss",
    href: "/weight-loss-training-mylapore",
  },
  {
    icon: Target,
    title: "Strength Training",
    desc: "Progressive overload-based strength programming with proper coaching. Build functional strength safely with compound movements and technique correction from day one.",
    tag: "Progressive",
    href: "/strength-training-mylapore",
  },
  {
    icon: Activity,
    title: "Beginner Fitness Coaching",
    desc: "New to the gym? Start with proper guidance. Learn correct techniques, build a consistent habit, and improve your fitness — with a coach who supports you from day one.",
    tag: "All levels",
    href: "/gym-in-mylapore",
  },
  {
    icon: BarChart2,
    title: "Body Composition Analysis",
    desc: "Track real progress beyond the scale. Periodic body composition assessments measure actual fat loss and muscle gain so you always know how your training is working.",
    tag: "Progress tracking",
    href: null,
  },
];

const faqs = [
  {
    q: "Is Yos Fitness Studio beginner-friendly?",
    a: "Yes. Yos Fitness Studio is built to be welcoming for beginners. Every new member receives proper coaching from day one — structured guidance, technique correction, and a supportive environment where you never feel lost or intimidated.",
  },
  {
    q: "What makes Yos different from a large commercial gym?",
    a: "Yos is a friendly neighbourhood gym — not a chain. Our coaches know members by name and are actively involved in every session. We offer semi-private coaching (max 4 per slot), structured workout plans, and personal attention that is rare in a large gym.",
  },
  {
    q: "What is semi-private coaching?",
    a: "Semi-private coaching at Yos is a small-group training format with a maximum of 4 members per session. A dedicated coach leads every session — giving each member technique guidance, form correction, and a structured workout. Coaching quality, accessible price.",
  },
  {
    q: "Is semi-private coaching better than general gym training?",
    a: "For most people, yes. With semi-private coaching you receive structured workouts, form correction, and a coach who tracks your progress — rather than training alone without guidance. The small group size (max 4) ensures real attention every session.",
  },
  {
    q: "Can I visit Yos Fitness Studio before joining?",
    a: `Yes. Walk in and see the studio in Mylapore. We recommend calling or WhatsApping ahead on ${PHONE_DISPLAY} so the team can be ready to show you around.`,
  },
  {
    q: "Do you offer personal attention during workouts?",
    a: "Yes. At Yos, coaches are actively involved — not just supervising from a distance. Whether you join for personal training or semi-private coaching, your coach provides technique feedback, tracks your progress, and adjusts your programme as you improve.",
  },
  {
    q: "What are the opening hours?",
    a: `${HOURS_WEEKDAY}. ${HOURS_SUNDAY}.`,
  },
  {
    q: "Which areas is Yos Fitness Studio near?",
    a: "Yos Fitness Studio is at 1st & 2nd Floor, Old No. 54 & 55, New No. 107 & 109, Kutchery Road, Mylapore, Chennai — 600 004. Members come from Mandaveli, Alwarpet, Santhome, Luz, Royapettah, and Triplicane — all a short distance from the studio.",
  },
];

// ── Page component ────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${WA_ENQUIRY}`;
  const waSemiPrivate = `https://wa.me/${WHATSAPP_NUMBER}?text=${WA_SEMI_PRIVATE}`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="min-h-screen bg-white font-sans">

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 bg-white/98 backdrop-blur border-b border-red-100 shadow-sm">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4" aria-label="Main navigation">
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <Image src="/Logo.png" alt="Yos Fitness Studio logo" width={48} height={48} className="h-10 w-auto object-contain" priority />
              <div className="leading-tight">
                <p className="font-extrabold text-gray-900 text-sm leading-none uppercase tracking-wide">Yos Fitness Studio</p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <a href="#about" className="hover:text-red-600 transition-colors">About</a>
              <a href="#semi-private" className="hover:text-red-600 transition-colors">Semi-Private</a>
              <a href="#services" className="hover:text-red-600 transition-colors">Services</a>
              <a href="#memberships" className="hover:text-red-600 transition-colors">Membership</a>
              <a href="#location" className="hover:text-red-600 transition-colors">Find Us</a>
              <a href="#faq" className="hover:text-red-600 transition-colors">FAQ</a>

              {/* Member Portal dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-orange-600 transition-colors select-none font-semibold text-orange-600">
                  Member Portal
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" aria-hidden="true" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 overflow-hidden">
                  <div className="py-1.5">
                    <Link href="/member-portal" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                      <span className="text-base">🏋️</span>
                      <span className="font-medium text-sm">Member Portal</span>
                    </Link>
                    <Link href="/member-checkin" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                      <span className="text-base">✅</span>
                      <span className="font-medium text-sm">Check In</span>
                    </Link>
                    <Link href="/my-membership" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                      <span className="text-base">📅</span>
                      <span className="font-medium text-sm">My Membership</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Staff Portal dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-red-600 transition-colors select-none">
                  Staff Portal
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" aria-hidden="true" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 overflow-hidden">
                  <div className="py-1.5">
                    <Link href="/staff-dashboard" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <span className="text-base">🏠</span>
                      <span className="font-medium text-sm">Staff Dashboard</span>
                    </Link>
                    <Link href="/checkin" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <span className="text-base">📍</span>
                      <span className="font-medium text-sm">Sign In</span>
                    </Link>
                    <div className="mx-4 my-1 border-t border-gray-100" />
                    <Link href="/join" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <span className="text-base">✍️</span>
                      <span className="font-medium text-sm">Register as Staff</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <a href={`tel:${PHONE_TEL}`} className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-red-50" aria-label={`Call Yos Fitness Studio at ${PHONE_DISPLAY}`}>
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden lg:inline">Call Us</span>
              </a>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-bold px-4 py-2 rounded-xl shadow-md shadow-green-200 transition-all" aria-label="WhatsApp Yos Fitness Studio">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">WhatsApp Us</span>
              </a>
              {/* Mobile hamburger — renders client-side */}
              <MobileNav />
            </div>
          </nav>
        </header>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section id="hero" className="relative bg-stone-950 overflow-hidden" aria-labelledby="hero-heading">
          <div className="absolute top-[-120px] left-[-120px] w-[600px] h-[600px] rounded-full bg-red-600/20 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-[-80px] right-[-80px] w-[450px] h-[450px] rounded-full bg-red-700/15 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-red-900/10 blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 lg:py-36">
            <div className="mb-7">
              <Image src="/Logo.png" alt="Yos Fitness Studio logo" width={120} height={120} className="h-24 w-auto object-contain" priority />
            </div>
            <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight max-w-4xl">
              Yos Fitness Studio —{" "}
              <span className="text-red-400">Your Friendly Neighbourhood Gym</span>{" "}
              in Mylapore
            </h1>

            <p className="mt-6 text-gray-400 text-lg sm:text-xl leading-relaxed max-w-2xl">
              Train with coaches who know your name. Get real guidance through
              semi-private coaching, personal training, fat loss, and strength
              programmes — in a welcoming, beginner-friendly studio built for Mylapore.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a href={waSemiPrivate} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-green-900/30 transition-all">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Ask About Semi-Private Coaching
              </a>
              <a href="#memberships" className="inline-flex items-center justify-center gap-2 border-2 border-white/25 hover:border-red-400/70 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all hover:bg-white/8 active:scale-95">
                View Membership Plans
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-3" aria-label="Available programmes">
              {["Semi-Private Coaching", "Personal Training", "Weight Loss", "Strength Training", "Beginner-Friendly", "Neighbourhood Gym"].map((tag) => (
                <span key={tag} className="bg-white/10 border border-white/15 text-gray-300 text-xs font-medium px-3 py-1.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Quick Info Bar ───────────────────────────────────────────────── */}
        <section className="bg-red-600" aria-label="Location and contact info">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-white text-sm font-medium">
              <a href={GBP_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-red-100 transition-colors" aria-label="Get directions to Yos Fitness Studio">
                <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>107 & 109, Kutchery Road, Mylapore — 600 004</span>
              </a>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{HOURS_INLINE}</span>
              </div>
              <a href={`tel:${PHONE_TEL}`} className="flex items-center gap-2 hover:text-red-100 transition-colors font-bold" aria-label={`Call us at ${PHONE_DISPLAY}`}>
                <Phone className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{PHONE_DISPLAY}</span>
              </a>
            </div>
          </div>
        </section>

        {/* ── Semi-Private Coaching Spotlight ─────────────────────────────── */}
        <section id="semi-private" className="py-24 bg-gradient-to-b from-red-50 via-white to-white relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-100 to-transparent" aria-hidden="true" />
          <div className="absolute top-[-40px] right-[-40px] w-[280px] h-[280px] rounded-full bg-red-100/60 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-red-600 rounded-full px-4 py-1.5 mb-6 shadow-md shadow-red-200">
                  <Zap className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  <span className="text-white text-xs font-bold uppercase tracking-widest">Our Flagship Programme</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                  Semi-Private Coaching —{" "}
                  <span className="text-red-600">The Yos Way to Train</span>
                </h2>
                <p className="mt-5 text-gray-600 text-lg leading-relaxed">
                  Small group. Big results. Maximum 4 members per slot — with a
                  dedicated coach who gives every person real attention, real form
                  correction, and a real workout plan.
                </p>
                <p className="mt-3 text-gray-500 text-base leading-relaxed">
                  Better than training alone. More affordable than one-on-one personal
                  training. The coaching quality you deserve, without the premium price.
                </p>
                <div className="mt-8 space-y-3">
                  {[
                    "Maximum 4 members per coached session",
                    "Dedicated coach for every session",
                    "Technique correction and form coaching",
                    "Structured workouts — not random exercises",
                    "Accountability and progress tracking",
                    "Friendly, supportive training environment",
                  ].map((point) => (
                    <div key={point} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-red-500 flex-shrink-0" aria-hidden="true" />
                      <span className="text-gray-700 text-sm">{point}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <a href={waSemiPrivate} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-green-200 transition-all text-sm">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    WhatsApp for Semi-Private Coaching
                  </a>
                  <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-600 font-semibold px-6 py-3.5 rounded-xl transition-all text-sm active:scale-95">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    Call to Enquire
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Max Group Size", value: "4", desc: "Members per coached slot" },
                  { label: "Dedicated Coach", value: "✓", desc: "Every session, every member" },
                  { label: "Form Coaching", value: "✓", desc: "Real-time technique correction" },
                  { label: "Structured Plan", value: "✓", desc: "Purposeful, progressive workouts" },
                ].map(({ label, value, desc }) => (
                  <div key={label} className="bg-red-600 rounded-2xl p-6 text-center shadow-xl shadow-red-200">
                    <p className="text-4xl font-extrabold text-white mb-1">{value}</p>
                    <p className="text-red-100 font-semibold text-sm mt-1">{label}</p>
                    <p className="text-red-200 text-xs mt-1.5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── About ────────────────────────────────────────────────────────── */}
        <section id="about" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">About Yos Fitness Studio</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                Your Neighbourhood Gym in Mylapore
              </h2>
              <p className="mt-5 text-gray-600 text-lg leading-relaxed">
                Yos Fitness Studio is a friendly, coaching-focused gym in Mylapore,
                Chennai. We are built for people who want to train with a purpose — and
                with coaches who are genuinely invested in their progress.
              </p>
              <p className="mt-4 text-gray-600 text-lg leading-relaxed">
                Whether you are a complete beginner or working towards a specific fitness
                goal, you get structured guidance, proper technique coaching, and a warm,
                welcoming environment where you always feel supported.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Users, title: "Coaches Who Know You", desc: "At Yos, your coach knows your name, your goal, and your progress. You are never just a face in the crowd." },
                { icon: Shield, title: "Structured Guidance", desc: "Every member trains with a proper plan — not random exercises. Coaching-guided sessions ensure you always progress purposefully." },
                { icon: Award, title: "Beginner-Friendly", desc: "No intimidating gym culture. Yos is a welcoming, supportive space where beginners receive the same coaching attention as experienced members." },
                { icon: CheckCircle2, title: "Consistent Progress", desc: "Structured programming, accountability, and regular check-ins keep your results moving. Progress you can see and measure." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-red-200 hover:shadow-lg hover:shadow-red-50 transition-all">
                  <div className="bg-red-50 rounded-xl p-3 w-fit mb-4"><Icon className="h-5 w-5 text-red-600" aria-hidden="true" /></div>
                  <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Choose Yos ───────────────────────────────────────────────── */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Why Yos</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                Training at Yos Is Different
              </h2>
              <p className="mt-5 text-gray-600 text-lg leading-relaxed">
                Some gyms offer lots of equipment and a membership card. At Yos, we offer
                something more valuable — coaches who know your name, semi-private coaching
                with personal attention, and a neighbourhood gym environment where you
                actually feel at home.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                {
                  icon: Users,
                  title: "Coaches Who Know Your Name",
                  desc: "Your coach knows your history, your goals, and your progress. Sessions are coached — not just supervised. You get feedback, correction, and encouragement every time.",
                },
                {
                  icon: Zap,
                  title: "Semi-Private Coaching for Everyone",
                  desc: "Our flagship format — small groups of up to 4, with a dedicated coach. You get the attention of personal training without the price. Proper guidance, every session.",
                },
                {
                  icon: Shield,
                  title: "No Intimidating Gym Culture",
                  desc: "Walk in and feel welcome. Yos is a friendly, non-judgmental space. Beginners, experienced lifters, and everyone in between trains here comfortably.",
                },
                {
                  icon: MapPin,
                  title: "Your Local Neighbourhood Gym",
                  desc: "Yos is rooted in Mylapore. A gym where the coaches recognise you, where you feel comfortable walking in, and where the community is friendly and local.",
                },
                {
                  icon: Target,
                  title: "Guided Workouts — Not Left Alone",
                  desc: "Every member follows a structured plan with coaching support. No guesswork, no wasted sessions. You always know what you are doing and why.",
                },
                {
                  icon: CheckCircle2,
                  title: "Walk-In Friendly",
                  desc: "We welcome walk-ins. Come and see the studio, meet the coaches, and understand how we train. No hard sell — just an honest conversation about your fitness goal.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-red-200 hover:shadow-lg hover:shadow-red-50 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="bg-red-50 group-hover:bg-red-100 rounded-xl p-3 flex-shrink-0 transition-colors">
                      <Icon className="h-5 w-5 text-red-600" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Services ────────────────────────────────────────────────────── */}
        <section id="services" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Training Programmes</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                What We Offer at Yos Fitness Studio
              </h2>
              <p className="mt-4 text-gray-600 text-base">
                Coached programmes for every fitness goal — semi-private coaching, personal training,
                weight loss, strength, and more — for all levels.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(({ icon: Icon, title, desc, tag, href }) => (
                <div key={title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:shadow-red-50 hover:border-red-200 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-red-50 group-hover:bg-red-100 rounded-xl p-3 transition-colors">
                      <Icon className="h-5 w-5 text-red-600" aria-hidden="true" />
                    </div>
                    <span className="bg-red-50 text-red-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-red-100">{tag}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                  {href && (
                    <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm font-semibold transition-colors group/link">
                      Learn more <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 transition-transform" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <a href={waSemiPrivate} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-green-200 transition-all">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Ask About Semi-Private Coaching
              </a>
            </div>
          </div>
        </section>

        {/* ── Who We Serve ────────────────────────────────────────────────── */}
        <section className="py-20 bg-gray-50" aria-label="Who trains at Yos Fitness Studio">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Who We Train</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Yos Is for Everyone in Mylapore</h2>
              <p className="mt-4 text-gray-600">From first-timers to experienced gym goers — students, working professionals, homemakers, and anyone who wants proper guidance and real results in a friendly environment.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { emoji: "🎓", label: "Students" },
                { emoji: "💼", label: "Working Professionals" },
                { emoji: "🌱", label: "Complete Beginners" },
                { emoji: "🔥", label: "Weight Loss Goal" },
                { emoji: "💪", label: "Strength Training" },
                { emoji: "🎯", label: "Semi-Private Coaching" },
              ].map(({ emoji, label }) => (
                <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 text-center hover:border-red-200 hover:bg-red-50 hover:shadow-md hover:shadow-red-50 transition-all cursor-default">
                  <div className="text-3xl mb-2" aria-hidden="true">{emoji}</div>
                  <p className="text-gray-800 text-sm font-semibold">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Memberships ─────────────────────────────────────────────────── */}
        <section id="memberships" className="py-20 bg-stone-950 relative overflow-hidden">
          <div className="absolute top-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full bg-red-700/10 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <p className="text-red-400 text-sm font-bold uppercase tracking-widest mb-3">Membership Plans</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Join Yos Fitness Studio in Mylapore
              </h2>
              <p className="mt-4 text-gray-400">
                Flexible plans for every schedule and budget. WhatsApp us on{" "}
                <a href={`tel:${PHONE_TEL}`} className="text-red-400 font-semibold hover:underline">{PHONE_DISPLAY}</a>{" "}
                for current pricing and to find the right plan for your goal.
              </p>
            </div>

            {/* Programme blocks */}
            <div className="space-y-8 max-w-5xl mx-auto">

              {/* Programme 1: General Membership */}
              <article className="bg-white/5 border border-white/10 rounded-2xl p-7 hover:border-red-500/40 transition-all">
                <div className="mb-5">
                  <h3 className="text-xl font-extrabold text-white mb-1">General Membership</h3>
                  <p className="text-gray-400 text-sm">Access the gym, train with coaching guidance, and track your progress.</p>
                </div>
                <ul className="flex flex-wrap gap-x-6 gap-y-1.5 mb-6">
                  {["Equipment access", "Coaching guidance", "Attendance tracking"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-red-400" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex gap-3 flex-wrap">
                    <span className="bg-white/8 border border-white/15 text-gray-300 text-sm font-semibold px-4 py-2 rounded-xl">3 Months</span>
                    <span className="bg-red-600 border border-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl relative">
                      6 Months
                      <span className="absolute -top-2 -right-2 bg-white text-red-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide leading-none">Popular</span>
                    </span>
                    <span className="bg-white/8 border border-white/15 text-gray-300 text-sm font-semibold px-4 py-2 rounded-xl">12 Months</span>
                  </div>
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-green-900/30">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Get Pricing on WhatsApp
                  </a>
                </div>
              </article>

              {/* Programme 2: Semi-Private Coaching */}
              <article className="bg-white/5 border border-white/10 rounded-2xl p-7 hover:border-red-500/40 transition-all">
                <div className="mb-5">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-extrabold text-white">Semi-Private Coaching</h3>
                    <span className="bg-red-600/30 border border-red-500/40 text-red-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">Max 4 per slot</span>
                  </div>
                  <p className="text-gray-400 text-sm">Small-group coaching with a dedicated coach — personal training quality at an accessible price.</p>
                </div>
                <ul className="flex flex-wrap gap-x-6 gap-y-1.5 mb-6">
                  {["Max 4 per session", "Dedicated coach", "Form correction", "Progress tracking"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-red-400" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex gap-3 flex-wrap">
                    <span className="bg-white/8 border border-white/15 text-gray-300 text-sm font-semibold px-4 py-2 rounded-xl">3 Months</span>
                    <span className="bg-red-600 border border-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl relative">
                      6 Months
                      <span className="absolute -top-2 -right-2 bg-white text-red-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide leading-none">Popular</span>
                    </span>
                    <span className="bg-white/8 border border-white/15 text-gray-300 text-sm font-semibold px-4 py-2 rounded-xl">12 Months</span>
                  </div>
                  <a href={waSemiPrivate} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-green-900/30">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Get Pricing on WhatsApp
                  </a>
                </div>
              </article>

              {/* Programme 3: Personal Training */}
              <article className="bg-white/5 border border-white/10 rounded-2xl p-7 hover:border-red-500/40 transition-all">
                <div className="mb-5">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-extrabold text-white">Personal Training</h3>
                    <span className="bg-red-600/30 border border-red-500/40 text-red-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">1-on-1</span>
                  </div>
                  <p className="text-gray-400 text-sm">Fully personalised one-on-one coaching built entirely around your goal.</p>
                </div>
                <ul className="flex flex-wrap gap-x-6 gap-y-1.5 mb-6">
                  {["Fully personalised programme", "Dedicated coach", "Technique coaching", "Full accountability"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-red-400" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex gap-3 flex-wrap">
                    <span className="bg-white/8 border border-white/15 text-gray-300 text-sm font-semibold px-4 py-2 rounded-xl">3 Months</span>
                    <span className="bg-red-600 border border-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl relative">
                      6 Months
                      <span className="absolute -top-2 -right-2 bg-white text-red-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide leading-none">Popular</span>
                    </span>
                    <span className="bg-white/8 border border-white/15 text-gray-300 text-sm font-semibold px-4 py-2 rounded-xl">12 Months</span>
                  </div>
                  <a href={waSemiPrivate} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-green-900/30">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Get Pricing on WhatsApp
                  </a>
                </div>
              </article>

            </div>

            <p className="text-center text-gray-500 text-sm mt-8">
              Prices vary by programme and duration. WhatsApp us for current rates and availability.{" "}
              <a href={waSemiPrivate} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline font-semibold">Ask about semi-private coaching →</a>
            </p>
          </div>
        </section>

        {/* ── Made for Mylapore ────────────────────────────────────────────── */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Local & Community</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              Made for Mylapore
            </h2>
            <p className="mt-5 text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
              Yos Fitness Studio is your neighbourhood gym — built for residents of
              Mylapore and the surrounding areas of South Chennai. A local studio where
              coaches know your name and the community feels like your own.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 justify-center">
              {["Mylapore", "Mandaveli", "Luz", "Alwarpet", "Santhome", "Royapettah", "Triplicane"].map((area) => (
                <span key={area} className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-5 py-2 rounded-full">{area}</span>
              ))}
            </div>
            <p className="mt-6 text-gray-500 text-sm">
              All within easy reach of Yos Fitness Studio, Mylapore.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-7 py-3.5 rounded-xl shadow-md shadow-green-200 transition-all text-sm">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp to Enquire
              </a>
              <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-600 font-bold py-3.5 px-7 rounded-xl text-sm transition-all">
                <Phone className="h-4 w-4" aria-hidden="true" />
                {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </section>

        {/* ── Location ─────────────────────────────────────────────────────── */}
        <section id="location" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Find Us</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Visit Yos Fitness Studio in Mylapore</h2>
              <p className="mt-4 text-gray-600">Conveniently located in Mylapore — accessible from Mandaveli, Alwarpet, Santhome, Luz, Royapettah, and Triplicane.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div className="space-y-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                  <h3 className="font-bold text-gray-900 text-lg mb-4">Yos Fitness Studio</h3>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <MapPin className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Address</p>
                        <address className="not-italic text-gray-600 text-sm mt-0.5 leading-relaxed">
                          1st & 2nd Floor, Old No. 54 & 55,<br />New No. 107 & 109, Kutchery Road<br />Mylapore, Chennai — 600 004<br />Tamil Nadu, India
                        </address>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Phone className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Phone / WhatsApp</p>
                        <a href={`tel:${PHONE_TEL}`} className="text-red-600 font-semibold text-sm hover:underline mt-0.5 block">{PHONE_DISPLAY}</a>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Clock className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Opening Hours</p>
                        <div className="text-gray-600 text-sm mt-0.5 space-y-0.5">
                          <p><span className="font-medium text-gray-700">Mon – Sat:</span> 6:00 AM – 12:00 PM and 4:00 PM – 9:30 PM</p>
                          <p><span className="font-medium text-gray-700">Sunday:</span> 8:00 AM – 11:00 AM</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold py-3 px-5 rounded-xl text-sm transition-all shadow-md shadow-green-200">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    WhatsApp Us
                  </a>
                  <a href={`tel:${PHONE_TEL}`} className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-600 font-bold py-3 px-5 rounded-xl text-sm transition-all">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {PHONE_DISPLAY}
                  </a>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md h-[400px] lg:h-full min-h-[380px]">
                <iframe
                  src={GMAPS_EMBED_SRC}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: "380px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Yos Fitness Studio — Mylapore, Chennai on Google Maps"
                  aria-label="Map showing Yos Fitness Studio location in Mylapore, Chennai"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section id="faq" className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">FAQ</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Frequently Asked Questions</h2>
              <p className="mt-4 text-gray-600">
                Questions about Yos Fitness Studio in Mylapore? Find answers below, or call / WhatsApp us on{" "}
                <a href={`tel:${PHONE_TEL}`} className="text-red-600 font-semibold hover:underline">{PHONE_DISPLAY}</a>.
              </p>
            </div>
            <div className="space-y-3">
              {faqs.map(({ q, a }) => (
                <details key={q} className="bg-white border border-gray-200 rounded-2xl group hover:border-red-200 open:border-red-200 open:shadow-md open:shadow-red-50 transition-all">
                  <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none select-none">
                    <span className="font-semibold text-gray-900 text-base">{q}</span>
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 group-open:rotate-180 transition-transform duration-200" aria-hidden="true" />
                  </summary>
                  <div className="px-6 pb-5"><p className="text-gray-600 text-sm leading-relaxed">{a}</p></div>
                </details>
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className="text-gray-600 text-sm mb-4">Still have a question? We are happy to help.</p>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-6 py-3 rounded-xl shadow-md shadow-green-200 transition-all text-sm">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Ask Us on WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* ── Find Us on Google ────────────────────────────────────────────── */}
        <section id="google" className="py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Google Business Profile</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Find Yos Fitness Studio on Google</h2>
              <p className="mt-4 text-gray-600 max-w-xl mx-auto">We are listed on Google Maps. Search for us, get directions, or call us directly from our Google Business Profile.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 max-w-2xl mx-auto">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-red-100 rounded-xl p-3 flex-shrink-0">
                  <MapPin className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-extrabold text-gray-900 text-xl leading-tight">Yos Fitness Studio</p>
                  <address className="not-italic text-gray-600 text-sm mt-1 leading-relaxed">1st and 2nd Floor, Old. 54 & 55 New,<br />107 & 109, Kutchery Rd<br />Mylapore, Chennai — 600 004<br />Tamil Nadu, India</address>
                </div>
              </div>
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-red-600 flex-shrink-0" aria-hidden="true" />
                  <a href={`tel:${PHONE_TEL}`} className="text-red-600 font-semibold hover:underline">{PHONE_DISPLAY}</a>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                  <span className="text-gray-600">www.yosfitnessstudio.in</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href={GBP_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-5 rounded-xl text-sm transition-all shadow-md shadow-red-200">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  View on Google Maps
                </a>
                <a href="https://www.google.com/maps/dir/?api=1&destination=Yos+Fitness+Studio+Mylapore+Chennai" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-600 font-bold py-3 px-5 rounded-xl text-sm transition-all">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  Get Directions
                </a>
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">Call or WhatsApp us before visiting — {PHONE_DISPLAY} — so we can be ready for you.</p>
            </div>
          </div>
        </section>

        {/* ── Google Reviews CTA ───────────────────────────────────────────── */}
        <section id="reviews" className="py-20 bg-gradient-to-b from-white to-stone-50">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Google Reviews</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">Loved Your Training at Yos?</h2>
            <p className="mt-4 text-gray-600 text-lg leading-relaxed">A quick Google review takes 30 seconds — and helps more people in Mylapore find real coaching.</p>

            {/* Star rating display */}
            <div className="mt-6 inline-flex items-center gap-3 bg-white border border-yellow-200 rounded-2xl px-6 py-3 shadow-sm">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} className={`h-6 w-6 ${s <= 4 ? "text-yellow-400" : "text-yellow-300"}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-gray-900 font-bold text-lg">4.6</span>
              <span className="text-gray-500 text-sm">· 230 Google reviews</span>
            </div>

            <div className="mt-8">
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-bold text-base px-8 py-4 rounded-2xl shadow-lg border-2 border-gray-200 hover:border-yellow-300 hover:shadow-yellow-100 transition-all"
              >
                <svg className="h-6 w-6 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Leave a Google Review
              </a>
            </div>
            <p className="mt-5 text-gray-400 text-sm">Takes 30 seconds · Opens Google in a new tab</p>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="py-24 bg-red-600 relative overflow-hidden" aria-labelledby="cta-heading">
          <div className="absolute top-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full bg-red-700/50 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-[-40px] left-[-40px] w-[250px] h-[250px] rounded-full bg-red-500/30 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 id="cta-heading" className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Start Training at Your Neighbourhood Gym in Mylapore
            </h2>
            <p className="mt-4 text-red-100 text-lg">
              Walk in, WhatsApp, or call us. Ask about semi-private coaching, membership plans,
              or simply come and see the studio — no pressure, just a friendly conversation.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <a href={waSemiPrivate} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-white text-[#16a34a] hover:bg-green-50 active:scale-95 font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-red-900/20 transition-all">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Ask About Semi-Private Coaching
              </a>
              <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center justify-center gap-2 border-2 border-white/50 hover:border-white hover:bg-white/10 active:scale-95 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all">
                <Phone className="h-5 w-5" aria-hidden="true" />
                Call {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="bg-stone-950 text-gray-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Image src="/Logo.png" alt="Yos Fitness Studio logo" width={40} height={40} className="h-8 w-auto object-contain" />
                  <div>
                    <p className="text-white font-extrabold text-sm leading-none">Yos Fitness Studio</p>
                    <p className="text-gray-500 text-xs mt-0.5">Mylapore, Chennai</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-500">Your friendly neighbourhood gym in Mylapore, Chennai. Semi-private coaching, personal training, weight loss, and strength programmes for all fitness levels.</p>
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-4">Quick Links</p>
                <ul className="space-y-2 text-sm">
                  {[
                    { label: "About Yos Fitness Studio", href: "#about" },
                    { label: "Semi-Private Coaching", href: "#semi-private" },
                    { label: "Training Programmes", href: "#services" },
                    { label: "Membership Plans", href: "#memberships" },
                    { label: "Find Us in Mylapore", href: "#location" },
                    { label: "FAQ", href: "#faq" },
                  ].map(({ label, href }) => (
                    <li key={label}><a href={href} className="hover:text-red-400 transition-colors">{label}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-4">Our Services</p>
                <ul className="space-y-2 text-sm">
                  {[
                    { label: "Semi-Private Coaching", href: "/semi-private-coaching-chennai" },
                    { label: "Personal Training", href: "/personal-training-mylapore" },
                    { label: "Weight Loss Training", href: "/weight-loss-training-mylapore" },
                    { label: "Strength Training", href: "/strength-training-mylapore" },
                    { label: "Gym in Mylapore", href: "/gym-in-mylapore" },
                  ].map(({ label, href }) => (
                    <li key={label}><Link href={href} className="hover:text-red-400 transition-colors">{label}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-4">Member Portal</p>
                <ul className="space-y-2 text-sm">
                  {[
                    { label: "Member Portal", href: "/member-portal" },
                    { label: "Check In", href: "/member-checkin" },
                    { label: "My Membership", href: "/my-membership" },
                  ].map(({ label, href }) => (
                    <li key={label}><Link href={href} className="hover:text-orange-400 transition-colors">{label}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-4">Staff Portal</p>
                <ul className="space-y-2 text-sm">
                  {[
                    { label: "Staff Dashboard", href: "/staff-dashboard" },
                    { label: "Register as Staff", href: "/join" },
                  ].map(({ label, href }) => (
                    <li key={label}><Link href={href} className="hover:text-red-400 transition-colors">{label}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-4">Contact Us</p>
                <address className="not-italic space-y-3 text-sm">
                  <div className="flex gap-2.5"><MapPin className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" /><span>1st & 2nd Floor, Old No. 54 & 55,<br />New No. 107 & 109, Kutchery Road<br />Mylapore — 600 004<br />Tamil Nadu, India</span></div>
                  <div className="flex gap-2.5"><Phone className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" /><a href={`tel:${PHONE_TEL}`} className="hover:text-red-400 transition-colors font-semibold">{PHONE_DISPLAY}</a></div>
                  <div className="flex gap-2.5"><Clock className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" /><span>Mon–Sat: 6:00 AM–12:00 PM<br />& 4:00 PM–9:30 PM<br />Sunday: 8:00–11:00 AM</span></div>
                </address>
              </div>
            </div>
            <div className="mt-12 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
              <p>© {new Date().getFullYear()} Yos Fitness Studio · Mylapore, Chennai. All rights reserved.</p>
              <p>Neighbourhood Gym · Semi-Private Coaching · Personal Training · Weight Loss · Strength Training</p>
            </div>
          </div>
        </footer>

        {/* ── Floating WhatsApp ────────────────────────────────────────────── */}
        <a href={waSemiPrivate} target="_blank" rel="noopener noreferrer" aria-label={`Chat with Yos Fitness Studio on WhatsApp — ${PHONE_DISPLAY}`} className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-full p-4 shadow-2xl shadow-green-900/40 transition-all hover:scale-110 active:scale-95">
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-400 border-2 border-white" />
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      </div>
    </>
  );
}
