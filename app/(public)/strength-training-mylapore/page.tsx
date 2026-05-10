import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Phone, Clock, Dumbbell, MessageCircle,
  ArrowRight, ChevronDown, Target, Shield, CheckCircle2, Zap,
} from "lucide-react";

const PHONE_DISPLAY = "+91 98406 90418";
const PHONE_TEL = "+919840690418";
const WHATSAPP_NUMBER = "919840690418";
const SITE_URL = "https://www.yosfitness.in";
const WA_MESSAGE = "Hi%20Yos%20Fitness%20Studio!%20I%20would%20like%20to%20enquire%20about%20strength%20training.";

const STREET_ADDRESS = "1st and 2nd Floor, Old. 54 & 55 New, 107 & 109, Kutchery Rd";
const ADDRESS_SHORT = "Kutchery Rd, Mylapore — 600 004";

const serviceLinks = [
  { label: "Gym in Mylapore", href: "/gym-in-mylapore" },
  { label: "Personal Training in Mylapore", href: "/personal-training-mylapore" },
  { label: "Weight Loss Training", href: "/weight-loss-training-mylapore" },
  { label: "Semi-Private Coaching", href: "/semi-private-coaching-chennai" },
];

export const metadata: Metadata = {
  title: "Strength Training in Mylapore — Yos Fitness Studio, Chennai",
  description:
    "Strength training at Yos Fitness Studio in Mylapore, Chennai. Progressive overload-based programming, compound lifts, proper technique coaching, and safe progression for beginners and intermediate lifters. Call +91 98406 90418.",
  alternates: { canonical: `${SITE_URL}/strength-training-mylapore` },
  openGraph: {
    title: "Strength Training in Mylapore — Yos Fitness Studio",
    description:
      "Coached strength training in Mylapore, Chennai. Progressive programming, compound lifts, safe technique — for beginners and intermediate lifters.",
    url: `${SITE_URL}/strength-training-mylapore`,
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
      name: "Is strength training at Yos Fitness Studio suitable for beginners?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Strength training at Yos Fitness Studio in Mylapore is fully suitable for beginners. Your coach builds a programme appropriate for your starting point, teaches correct technique for every exercise from the first session, and progresses the training gradually so you build strength safely and without injury.",
      },
    },
    {
      "@type": "Question",
      name: "What is progressive overload and why does it matter for strength training?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Progressive overload is the gradual increase of stress placed on the body during training — through increased weight, more repetitions, or reduced rest. It is the principle that drives continuous strength and muscle gains over time. At Yos Fitness Studio, progressive overload is built into every strength training programme so that you keep improving consistently.",
      },
    },
    {
      "@type": "Question",
      name: "What lifts are included in strength training at Yos Fitness Studio Mylapore?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Strength training at Yos Fitness Studio is built around compound movements — exercises that work multiple muscle groups simultaneously. These include squats, deadlifts, presses, rows, and their variations. These movements build functional strength efficiently and form the foundation of any effective strength programme.",
      },
    },
    {
      "@type": "Question",
      name: "Will strength training make me look bulky?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Strength training does not automatically make people look bulky. Building significant muscle mass requires a very specific calorie surplus and training approach over a sustained period. For most people — especially women — strength training improves body composition, reduces fat, improves posture, and creates a leaner appearance. Your coach will explain the realistic outcomes based on your specific goal.",
      },
    },
  ],
};

const faqs = [
  {
    q: "Is strength training at Yos Fitness Studio suitable for beginners?",
    a: "Yes. Strength training at Yos Fitness Studio in Mylapore is fully suitable for beginners. Your coach builds a programme appropriate for your starting point, teaches correct technique for every exercise from the first session, and progresses the training gradually so you build strength safely without injury.",
  },
  {
    q: "What is progressive overload and why does it matter?",
    a: "Progressive overload is the gradual increase of stress placed on the body during training — through increased weight, more repetitions, or reduced rest. It is the principle that drives consistent strength and muscle gains over time. At Yos Fitness Studio, progressive overload is built into every strength training programme.",
  },
  {
    q: "What exercises are included in strength training?",
    a: "Strength training at Yos Fitness Studio is built around compound movements — exercises that work multiple muscle groups simultaneously. These include squats, deadlifts, presses, rows, and their variations. These movements build functional strength efficiently and form the foundation of any effective strength programme.",
  },
  {
    q: "Will strength training make me look bulky?",
    a: "No — not without a very specific calorie surplus and sustained effort to build mass. For most people, strength training improves body composition, reduces fat, improves posture, and creates a leaner appearance. Your coach will clarify the realistic outcomes based on your goal.",
  },
];

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function StrengthTrainingMylaporePage() {
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
              <Dumbbell className="h-3.5 w-3.5 text-red-500 flex-shrink-0" aria-hidden="true" />
              <span className="text-red-400 text-xs font-semibold tracking-wide">Progressive Overload · Mylapore, Chennai</span>
            </div>
            <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight max-w-4xl">
              Strength Training in Mylapore —{" "}
              <span className="text-red-500">Build Strength Safely</span>{" "}
              at Yos Fitness Studio
            </h1>
            <p className="mt-6 text-gray-400 text-lg sm:text-xl leading-relaxed max-w-2xl">
              Structured strength training with a coach who teaches the right technique, builds a progressive programme, and ensures you get stronger safely. Suitable for complete beginners through to intermediate lifters.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-red-900/40 transition-all">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Enquire About Strength Training
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

        {/* Key principles */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">The Approach</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                How Strength Training Works at Yos Fitness Studio
              </h2>
              <p className="mt-5 text-gray-600 text-lg leading-relaxed">
                Effective strength training is built on a few clear principles — correct technique, progressive loading, and consistency. At Yos Fitness Studio in Mylapore, every strength programme is built around these fundamentals, delivered with proper coaching.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Shield, title: "Technique First", desc: "Every exercise is taught with correct technique from the start. Good form is the foundation of safe, effective strength training — and prevents injury from the very first session." },
                { icon: Zap, title: "Progressive Overload", desc: "Your programme is designed to progressively challenge you — gradually increasing load, volume, or intensity so your body continues to adapt and you keep getting stronger over time." },
                { icon: Target, title: "Compound Movements", desc: "Strength programmes at Yos Fitness Studio are built around compound lifts — squats, deadlifts, presses, and rows — that develop functional strength across multiple muscle groups simultaneously." },
                { icon: CheckCircle2, title: "Safe Progression", desc: "Your coach monitors your form and recovery, adjusts the programme based on your response, and ensures progression happens at a pace that is safe and sustainable for your body." },
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

        {/* Benefits */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Why Strength Train</p>
              <h2 className="text-3xl font-extrabold text-gray-900">Benefits of Strength Training</h2>
              <p className="mt-4 text-gray-600 text-lg">
                Strength training is one of the most effective forms of exercise for improving overall health, body composition, and quality of life — regardless of age or starting fitness level.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Improved body composition", desc: "Strength training builds muscle and reduces fat — improving how you look and feel beyond what the weighing scale shows." },
                { title: "Better posture and movement", desc: "Compound lifts strengthen the muscles that support posture — reducing back pain, shoulder tightness, and the effects of long hours at a desk." },
                { title: "Increased metabolic rate", desc: "Muscle tissue burns more calories at rest than fat. Building muscle through strength training raises your baseline metabolism over time." },
                { title: "Stronger joints and bones", desc: "Resistance training strengthens bones and the connective tissue around joints — reducing the risk of injury in daily life and other physical activities." },
                { title: "Greater functional strength", desc: "Getting stronger in the gym translates to everyday life — carrying, lifting, climbing stairs, and physical activity all become easier." },
                { title: "Long-term health benefits", desc: "Regular strength training has well-documented benefits for cardiovascular health, blood sugar regulation, and overall longevity." },
              ].map(({ title, desc }) => (
                <div key={title} className="bg-white border border-gray-100 rounded-2xl p-5 flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm mb-1">{title}</p>
                    <p className="text-gray-600 text-xs leading-relaxed">{desc}</p>
                  </div>
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
            <p className="text-sm font-semibold text-red-700 mb-4">Members from across South Chennai train at Yos Fitness Studio</p>
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
              <h2 className="text-3xl font-extrabold text-gray-900">Strength Training — Questions Answered</h2>
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
              Start Strength Training in Mylapore
            </h2>
            <p className="mt-4 text-red-100 text-lg">
              WhatsApp or call Yos Fitness Studio to discuss your strength goals and find out how we can build a programme that works for you.
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
