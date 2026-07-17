"use client";

import Image from "next/image";

const CHECKIN_URL = "https://yosfitnessstudio.in/member-checkin";
const QR_IMG = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(CHECKIN_URL)}&bgcolor=ffffff&color=0a0a0a&margin=10`;

export default function CheckinQRPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0a0a0a" }}>
      <style>{`
        @media print {
          body { margin: 0; background: #0a0a0a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col items-center justify-center gap-8 px-8 py-12 text-center max-w-sm w-full">

        <Image src="/Logo.png" alt="Yos Fitness Studio" width={140} height={40}
          className="h-10 w-auto object-contain" priority />

        <div>
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-2">Daily Attendance</p>
          <h1 className="text-white text-4xl font-black leading-tight">
            Scan to Check In<br />or Check Out
          </h1>
        </div>

        <div className="p-5 rounded-3xl" style={{ background: "#fff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={QR_IMG} alt="Check-in / Check-out QR code" width={220} height={220} />
        </div>

        <div className="space-y-1">
          <p className="text-gray-600 text-xs tracking-widest uppercase">or visit</p>
          <p className="text-orange-400 text-sm font-bold tracking-wide">yosfitnessstudio.in/member-checkin</p>
        </div>

        <div className="w-full space-y-2">
          {["Scan the QR code", "Enter your 4-digit PIN", "Check in or out automatically 💪"].map((step, i) => (
            <div key={i} className="flex items-center gap-3 text-left">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
                {i + 1}
              </div>
              <p className="text-gray-400 text-sm">{step}</p>
            </div>
          ))}
        </div>

        <button onClick={() => window.print()}
          className="no-print mt-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-colors"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
