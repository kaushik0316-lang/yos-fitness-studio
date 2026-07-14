"use client";

import QRCode from "react-qr-code";
import { Printer } from "lucide-react";
import { GYM_NAME, GYM_LOCATION } from "@/lib/site-config";

const CHECKIN_URL = "https://yosfitnessstudio.in/member-checkin";
const PORTAL_URL  = "yosfitnessstudio.in/member-portal";

export default function CheckinPosterPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "#080D0A" }}
    >
      <style>{`
        @keyframes none {}
        @media print {
          body { margin: 0; background: #080D0A !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Ambient glow — top */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -120, left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400,
          background: "radial-gradient(ellipse at center, rgba(34,197,94,0.07) 0%, transparent 65%)",
        }}
      />

      {/* Print button */}
      <button
        onClick={() => window.print()}
        className="no-print fixed top-5 right-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
        style={{
          background: "#0F1A11",
          color: "#6B9E78",
          border: "1px solid #1A2E1E",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(34,197,94,0.4)";
          (e.currentTarget as HTMLButtonElement).style.color = "#22C55E";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#1A2E1E";
          (e.currentTarget as HTMLButtonElement).style.color = "#6B9E78";
        }}
      >
        <Printer className="h-3.5 w-3.5" />
        Print / Save PDF
      </button>

      {/* Poster content */}
      <div className="relative flex flex-col items-center w-full max-w-sm px-6 py-12 text-center">

        {/* Wordmark */}
        <div className="flex items-center gap-2.5 mb-10">
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ width: 36, height: 36, background: "#22C55E" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-bold text-[13px] uppercase tracking-[0.18em]" style={{ color: "#6B9E78" }}>
              {GYM_NAME}
            </p>
            <p className="text-[10px] uppercase tracking-[0.25em] mt-0.5" style={{ color: "#2E4A35" }}>
              {GYM_LOCATION}
            </p>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="font-extrabold uppercase leading-none mb-1.5"
          style={{ fontSize: "clamp(36px, 10vw, 52px)", letterSpacing: "-0.01em", color: "#E8F5E9" }}
        >
          Scan to
        </h1>
        <h1
          className="font-extrabold uppercase leading-none mb-2"
          style={{ fontSize: "clamp(36px, 10vw, 52px)", letterSpacing: "-0.01em", color: "#22C55E" }}
        >
          Check In
        </h1>
        <p
          className="text-xs uppercase tracking-[0.15em] mb-10"
          style={{ color: "#2E4A35" }}
        >
          Point your camera at the code
        </p>

        {/* QR frame */}
        <div
          className="relative rounded-[20px] p-5 mb-10"
          style={{
            background: "#0F1A11",
            border: "1.5px solid rgba(34,197,94,0.2)",
            boxShadow: "0 0 40px -8px rgba(34,197,94,0.3), inset 0 1px 0 rgba(34,197,94,0.06)",
          }}
        >
          {/* Corner accents */}
          {[
            { top: 10, left: 10,  borderTop: "2px solid #22C55E", borderLeft: "2px solid #22C55E",  borderRadius: "4px 0 0 0" },
            { top: 10, right: 10, borderTop: "2px solid #22C55E", borderRight: "2px solid #22C55E", borderRadius: "0 4px 0 0" },
            { bottom: 10, left: 10,  borderBottom: "2px solid #22C55E", borderLeft: "2px solid #22C55E",  borderRadius: "0 0 0 4px" },
            { bottom: 10, right: 10, borderBottom: "2px solid #22C55E", borderRight: "2px solid #22C55E", borderRadius: "0 0 4px 0" },
          ].map((s, i) => (
            <div key={i} className="absolute" style={{ width: 18, height: 18, ...s }} />
          ))}

          <QRCode
            value={CHECKIN_URL}
            size={220}
            bgColor="#0F1A11"
            fgColor="#22C55E"
            style={{ borderRadius: 8 }}
          />
        </div>

        {/* Steps */}
        <div className="w-full flex flex-col gap-2.5 mb-10">
          {[
            { n: "1", text: <span style={{ color: "#6B9E78" }}>Open your <strong style={{ color: "#E8F5E9", fontWeight: 600 }}>phone camera</strong></span> },
            { n: "2", text: <span style={{ color: "#6B9E78" }}>Point at the QR code above</span> },
            { n: "3", text: <span style={{ color: "#6B9E78" }}>Enter your <strong style={{ color: "#E8F5E9", fontWeight: 600 }}>4-digit PIN</strong> to check in</span> },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-center gap-3 text-left">
              <div
                className="flex items-center justify-center flex-shrink-0 text-[11px] font-bold rounded-lg"
                style={{
                  width: 26, height: 26,
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  color: "#22C55E",
                }}
              >
                {n}
              </div>
              <p className="text-[13px] leading-snug">{text}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full mb-5">
          <div className="flex-1 h-px" style={{ background: "#1A2E1E" }} />
          <span className="text-[10px] uppercase tracking-[0.2em] whitespace-nowrap" style={{ color: "#2E4A35" }}>
            or visit directly
          </span>
          <div className="flex-1 h-px" style={{ background: "#1A2E1E" }} />
        </div>

        {/* PIN link */}
        <p className="text-[11px] uppercase tracking-[0.15em] mb-1" style={{ color: "#2E4A35" }}>
          No PIN yet? Set one up at
        </p>
        <p className="text-[13px] font-semibold tracking-wide" style={{ color: "#22C55E" }}>
          {PORTAL_URL}
        </p>
      </div>
    </div>
  );
}
