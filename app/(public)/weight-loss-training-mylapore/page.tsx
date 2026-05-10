import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Phone, Clock, Dumbbell, MessageCircle,
  ArrowRight, ChevronDown, TrendingDown, BarChart2, CheckCircle2, Flame,
} from "lucide-react";

const PHONE_DISPLAY = "+91 98406 90418";
const PHONE_TEL = "+919840690418";
const WHATSAPP_NUMBER = "919840690418";
const SITE_URL = "https://www.yosfitness.in";
const WA_MESSAGE = "Hi%20Yos%20Fitness%20Studio!%20I%20would%20like%20to%20enquire%20about%20weight%20loss%20training.";

const STREET_ADDRESS = "1st and 2nd Floor, Old. 54 & 55 New, 107 & 109, Kutchery Rd";
const ADDRESS_SHORT = "Kutchery Rd, Mylapore — 600 004";

const serviceLinks = [
  { label: "Gym in Mylapore", href: "/gym-in-mylapore" },
  { label: "Personal Training in Mylapore", href: "/personal-training-mylapore" },
  { label: "Semi-Private Coaching", href: "/semi-private-coaching-chennai" },
  { label: "Strength Training in Mylapore", href: "/strength-training-mylapore" },
];

export const metadata: Metadata = {
  title: "Weight Loss Training in Mylapore — Yos Fitness Studio, Chennai",
  description:
    "Structured weight loss and fat loss training in Mylapore, Chennai. Yos Fitness Studio combines resistance training, cardio guidance, and nutrition awareness for sustainable fat loss. Call +91 98406 90418.",
  alternates: { canonical: `${SITE_URL}/weight-loss-training-mylapore` },
  openGraph: {
    title: "Weight Loss Training in Mylapore — Yos Fitness Studio",
    description:
      "Sustainable fat loss programmes in Mylapore, Chennai. Resistance training, cardio guidance, body composition tracking — no crash diets.",
    url: `${SITE_URL}/weight-loss-training-mylapore`,
    siteName: "Yos Fitness Studio",
    locale: "en_IN",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const businessSchema = {
  "@context": "https://schema.org",
  "@type": ["HealthClub", "LocalBusiness"],
  name: "Yos Fitness Studio",
  url: SITE_URL,
  telephone: PHONE_DISPLAY,
  address: {
    "@type": "PostalAddress",
    streetAddress: "1st and 2nd Floor, Old. 54 & 55 New, 107 & 109, Kutchery Rd",
    addressLocality: "Mylapore",
    addressRegion: "Tamil Nadu",
    postalCode: "600004",
    addressCountry: "IN",
  },
  sameAs: ["https://maps.app.goo.gl/rDUREt3pHRpgcC649"],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What type of training is best for weight loss in Mylapore?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The most effective approach for sustainable weight loss combines resistance training with cardio and practical nutrition awareness. At Yos Fitness Studio in Mylapore, fat loss programmes use this combination — structured workout plans with progressive resistance training, appropriate cardio, and guidance on nutrition principles that support fat loss without extreme restriction.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to see weight loss results at Yos Fitness Studio?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Results vary based on individual factors including starting fitness level, consistency, nutrition, and sleep. Most members who train consistently and follow their programme begin noticing improvements in energy, body composition, and strength within 4 to 6 weeks. Your coach tracks progress regularly and adjusts the programme to keep results moving.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to follow a strict diet to lose weight at Yos Fitness Studio?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No crash diets or extreme restrictions. At Yos Fitness Studio, the approach is based on practical nutrition awareness — understanding how to make sustainable dietary choices that support fat loss alongside your training programme. The goal is long-term results, not rapid weight loss that cannot be maintained.",
      },
    },
    {
      "@type": "Question",
      name: "Is weight loss training at Yos Fitness Studio suitable for beginners?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Weight loss training at Yos Fitness Studio in Mylapore is designed for all fitness levels, including complete beginners. Your coach builds a programme appropriate for your current fitness level, ensures you learn correct technique, and progresses the training at a pace that is safe and effective for you.",
      },
    },
  ],
};

const faqs = [
  {
    q: "What type of training is best for weight loss?",
    a: "The most effective approach for sustainable fat loss combines resistance training with cardio and practical nutrition awareness. At Yos Fitness Studio in Mylapore, fat loss programmes use structured resistance training, appropriate cardio guidance, and nutrition principles that support fat loss without extreme restriction.",
  },
  {
    q: "How long before I see weight loss results?",
    a: "Results vary based on consistency, nutrition, sleep, and starting point. Most members training consistently begin noticing improvements in energy, body composition, and strength within 4 to 6 weeks. Your coach tracks progress regularly and adjusts the programme to keep results moving.",
  },
  {
    q: "Do I need to follow a strict diet?",
    a: "No crash diets. At Yos Fitness Studio, we focus on practical nutrition awareness — helping you make sustainable choices that support fat loss alongside your training. The goal is long-term results, not rapid weight loss that cannot be maintained.",
  },
  {
    q: "Is weight loss training suitable for beginners?",
    a: "Yes. Weight loss training at Yos Fitness Studio in Mylapore is designed for all fitness levels, including complete beginners. Your coach builds a programme appropriate for your current level, coaches correct technique from the start, and progresses the training safely as you improve.",
  },
];

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function WeightLossTrainingMylaporePage() {
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${WA_MESSAGE}`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="min-h-screen bg-white font-sans">

        {/* Nav */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <Image src="/Logo.png" alt="Yos Fitness Studio" width={48} height={48} className="h-10 w-auto object-contain" priority />
              <div className="leading-tight"><p className="font-extrabold text-gray-900 text-sm leading-none">Yos Fitness Studio</p><p className="text-[10px] text-gray-500 leading-none mt-0.5">Kutchery Rd, Mylapore</p></div>
            </Link>
            <div className="flex items-center gap-2">
              <a href={`tel:${PHONE_TEL}`} className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-red-700 transition-colors px-3 py-2 rounded-xl hover:bg-red-50">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden lg:inline">{PHONE_DISPLAY}</span><span className="lg:hidden">Call Us</span>
              </a>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-md shadow-red-200 transition-all">
                <MessageCircle className="h-4 w-4" aria-hidden="true" /><span>WhatsApp Us</span>
              </a>
            </div>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative bg-gray-950 overflow-hidden" aria-labelledby="hero-heading">
          <div className="absolute top-[-120px] left-[-120px] w-[500px] h-[500px] rounded-full bg-red-600/15 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full bg-red-700/10 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="inline-flex items-center gap-2 bg-red-600/15 border border-red-600/25 rounded-full px-4 py-1.5 mb-6">
              <Flame className="h-3.5 w-3.5 text-red-500 flex-shrink-0" aria-hidden="true" />
              <span className="text-red-400 text-xs font-semibold tracking-wide">Fat Loss · Mylapore, Chennai</span>
            </div>
            <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight max-w-4xl">
              Weight Loss Training in Mylapore —{" "}
              <span className="text-red-500">Sustainable Fat Loss</span>{" "}
              at Yos Fitness Studio
            </h1>
            <p className="mt-6 text-gray-400 text-lg sm:text-xl leading-relaxed max-w-2xl">
              Lose fat and improve your body composition with a structured training programme — not crash diets or extreme regimes. Yos Fitness Studio in Mylapore combines resistance training, cardio guidance, and practical nutrition awareness for results that last.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-red-900/40 transition-all">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Enquire About Weight Loss Training
              </a>
              <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center justify-center gap-2 border-2 border-white/20 hover:border-red-500/60 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all hover:bg-white/5">
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </section>

        {/* Info bar */}
        <section className="bg-red-600" aria-label="Location and hours">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-white text-sm font-medium">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" /><span>Kutchery Rd, Mylapore — 600 004</span></div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" /><span>Mon–Sat: 6:00 AM–12:00 PM & 4:00–9:30 PM &nbsp;|&nbsp; Sun: 8:00–11:00 AM</span></div>
              <a href={`tel:${PHONE_TEL}`} className="flex items-center gap-2 hover:text-red-100 transition-colors font-bold"><Phone className="h-4 w-4 flex-shrink-0" aria-hidden="true" /><span>{PHONE_DISPLAY}</span></a>
            </div>
          </div>
        </section>

        {/* The approach */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">The Approach</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                How We Approach Weight Loss at Yos Fitness Studio
              </h2>
              <p className="mt-5 text-gray-600 text-lg leading-relaxed">
                Sustainable fat loss comes from the right combination of resistance training, appropriate cardio, and practical nutrition — not from crash diets or excessive cardio alone. Every weight loss programme at Yos Fitness Studio in Mylapore is built around this principle.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: TrendingDown, title: "Resistance Training First", desc: "Building and preserving muscle is central to sustainable fat loss. Resistance training raises your metabolism, improves body composition, and ensures the weight you lose is fat — not muscle." },
                { icon: Flame, title: "Structured Cardio Guidance", desc: "Cardio is programmed purposefully — not mindlessly. Your coach guides you on the right type, duration, and intensity of cardio to support fat loss without burning out or losing muscle." },
                { icon: CheckCircle2, title: "Practical Nutrition Awareness", desc: "No extreme diets. We focus on practical, sustainable nutrition principles — helping you understand how to eat in a way that supports fat loss and complements your training." },
                { icon: BarChart2, title: "Body Composition Tracking", desc: "Progress is tracked through body composition measurements — not just the weighing scale. You see actual changes in fat mass and muscle, giving you a complete picture of your progress." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:border-red-200 hover:shadow-md transition-all">
                  <div className="bg-red-100 rounded-xl p-3 w-fit mb-4"><Icon className="h-5 w-5 text-red-600" aria-hidden="true" /></div>
                  <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What we avoid */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">What We Avoid</p>
              <h2 className="text-3xl font-extrabold text-gray-900">Fat Loss Without the Shortcuts</h2>
              <p className="mt-4 text-gray-600 text-lg">
                The fitness industry is full of quick-fix approaches that produce fast results followed by rapid regain. At Yos Fitness Studio in Mylapore, we focus on building habits and a programme that works in the long term.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { avoid: "Crash diets or extreme calorie restriction", why: "Causes muscle loss, metabolic slowdown, and is rarely sustainable." },
                { avoid: "Excessive cardio without resistance training", why: "Leads to muscle loss and often worsens long-term body composition." },
                { avoid: "Generic programmes not tailored to you", why: "One-size-fits-all training rarely produces consistent individual results." },
                { avoid: "Rapid weight loss that is difficult to maintain", why: "Most rapid weight loss is water and muscle — not fat." },
              ].map(({ avoid, why }) => (
                <div key={avoid} className="bg-white border border-gray-100 rounded-2xl p-5">
                  <p className="font-semibold text-gray-900 text-sm mb-1.5 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>{avoid}
                  </p>
                  <p className="text-gray-500 text-xs leading-relaxed pl-5">{why}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Other services */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Other Training Options</p>
              <h2 className="text-2xl font-extrabold text-gray-900">More at Yos Fitness Studio, Mylapore</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serviceLinks.map(({ label, href }) => (
                <Link key={href} href={href} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-red-200 transition-all group flex items-center justify-between gap-4">
                  <span className="font-semibold text-gray-900 text-sm">{label}</span>
                  <ArrowRight className="h-4 w-4 text-red-500 group-hover:translate-x-1 transition-transform flex-shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Nearby areas */}
        <section className="py-12 bg-red-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm font-semibold text-red-700 mb-4">Members come from across South Chennai</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Mylapore", "Mandaveli", "Alwarpet", "Santhome", "Luz", "Royapettah", "Triplicane"].map((area) => (
                <span key={area} className="bg-white border border-red-200 text-red-700 text-sm font-semibold px-4 py-1.5 rounded-full">{area}</span>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">FAQ</p>
              <h2 className="text-3xl font-extrabold text-gray-900">Weight Loss Training — Questions Answered</h2>
            </div>
            <div className="space-y-3">
              {faqs.map(({ q, a }) => (
                <details key={q} className="bg-gray-50 border border-gray-100 rounded-2xl group open:shadow-md transition-all">
                  <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none select-none">
                    <span className="font-semibold text-gray-900 text-base">{q}</span>
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 group-open:rotate-180 transition-transform duration-200" aria-hidden="true" />
                  </summary>
                  <div className="px-6 pb-5"><p className="text-gray-600 text-sm leading-relaxed">{a}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-red-600 relative overflow-hidden">
          <div className="absolute top-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full bg-red-700/40 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Ready to Start Your Fat Loss Journey?
            </h2>
            <p className="mt-4 text-red-100 text-lg">
              WhatsApp or call Yos Fitness Studio in Mylapore to discuss your weight loss goal and find out how we can help you get there sustainably.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-white text-red-700 hover:bg-red-50 font-bold text-base px-8 py-4 rounded-2xl shadow-xl transition-all">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                WhatsApp Us Today
              </a>
              <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center justify-center gap-2 border-2 border-white/40 hover:border-white text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all">
                <Phone className="h-5 w-5" aria-hidden="true" />
                Call {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-950 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
              <div>
                <Link href="/" className="flex items-center gap-3 mb-4">
                  <Image src="/Logo.png" alt="Yos Fitness Studio" width={40} height={40} className="h-8 w-auto object-contain" />
                  <div><p className="text-white font-extrabold text-sm leading-none">Yos Fitness Studio</p><p className="text-gray-500 text-xs mt-0.5">Mylapore, Chennai</p></div>
                </Link>
                <p className="text-sm text-gray-500 leading-relaxed">A coaching-focused gym in Mylapore, Chennai. Personal training, semi-private coaching, weight loss, and strength programmes for all fitness levels.</p>
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-4">Our Services</p>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/" className="hover:text-red-500 transition-colors">Home — Yos Fitness Studio</Link></li>
                  {serviceLinks.map(({ label, href }) => (
                    <li key={href}><Link href={href} className="hover:text-red-500 transition-colors">{label}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-4">Contact Us</p>
                <address className="not-italic space-y-3 text-sm">
                  <div className="flex gap-2.5"><MapPin className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" /><span>1st and 2nd Floor, Old. 54 & 55 New,<br />107 & 109, Kutchery Rd<br />Mylapore, Chennai — 600 004<br />Tamil Nadu, India</span></div>
                  <div className="flex gap-2.5"><Phone className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" /><a href={`tel:${PHONE_TEL}`} className="hover:text-red-500 font-semibold">{PHONE_DISPLAY}</a></div>
                  <div className="flex gap-2.5"><Clock className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" /><span>Mon–Sat: 6:00 AM–12:00 PM & 4:00–9:30 PM<br />Sunday: 8:00–11:00 AM</span></div>
                </address>
              </div>
            </div>
            <div className="pt-6 border-t border-white/8 text-xs text-gray-600 text-center">
              © {new Date().getFullYear()} Yos Fitness Studio · Mylapore, Chennai. All rights reserved.
            </div>
          </div>
        </footer>

        <a href={waLink} target="_blank" rel="noopener noreferrer" aria-label={`Chat with Yos Fitness Studio on WhatsApp — ${PHONE_DISPLAY}`} className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-full p-4 shadow-2xl shadow-green-900/30 transition-all hover:scale-110 active:scale-95">
          <WhatsAppIcon />
        </a>
      </div>
    </>
  );
}
