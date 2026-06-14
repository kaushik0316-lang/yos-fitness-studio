"use client";

import QRCode from "react-qr-code";
import Image from "next/image";

const CHECKIN_URL = "https://yosfitnessstudio.in/member-checkin";

export default function CheckinQRPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "#0a0a0a" }}>

      {/* Print styles */}
      <style>{`
        @media print {
          body { margin: 0; background: #0a0a0a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col items-center justify-center gap-8 px-8 py-12 text-center max-w-sm w-full">

        {/* Logo */}
        <Image src="/Logo.png" alt="Yos Fitness Studio" width={140} height={40}
          className="h-10 w-auto object-contain" priority />

        {/* Heading */}
        <div>
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-2">Daily Attendance</p>
          <h1 className="text-white text-4xl font-black leading-tight">
            Scan to<br />Check In
          </h1>
        </div>

        {/* QR */}
        <div className="p-5 rounded-3xl" style={{ background: "#fff" }}>
          <QRCode
            value={CHECKIN_URL}
            size={220}
            bgColor="#ffffff"
            fgColor="#0a0a0a"
            level="M"
          />
        </div>

        {/* URL hint */}
        <div className="space-y-1">
          <p className="text-gray-600 text-xs tracking-widest uppercase">or visit</p>
          <p className="text-orange-400 text-sm font-bold tracking-wide">yosfitnessstudio.in/member-checkin</p>
        </div>

        {/* Steps */}
        <div className="w-full space-y-2">
          {["Scan the QR code", "Enter your 4-digit PIN", "You're checked in! 💪"].map((step, i) => (
            <div key={i} className="flex items-center gap-3 text-left">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
                {i + 1}
              </div>
              <p className="text-gray-400 text-sm">{step}</p>
            </div>
          ))}
        </div>

        {/* Print button — hidden on print */}
        <button
          onClick={() => window.print()}
          className="no-print mt-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-colors"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
