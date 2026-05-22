"use client";

import QRCode from "react-qr-code";
import Image from "next/image";
import { Printer } from "lucide-react";

const CHECKIN_URL = "https://yosfitnessstudio.in/checkin";

export default function CheckinPosterPage() {
  return (
    <>
      {/* Print button — hidden on print */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition-colors text-sm"
        >
          <Printer className="h-4 w-4" />
          Print Poster
        </button>
      </div>

      {/* Poster — print-optimized */}
      <div
        className="poster min-h-screen flex items-center justify-center p-8"
        style={{ background: "#0c0c0c" }}
      >
        <div
          className="poster-card w-full max-w-sm mx-auto rounded-3xl p-10 flex flex-col items-center gap-8 text-center"
          style={{
            background: "linear-gradient(160deg, #161616 0%, #1a1008 100%)",
            border: "1px solid rgba(249,115,22,0.15)",
            boxShadow: "0 0 80px rgba(249,115,22,0.08)",
          }}
        >
          {/* Logo + Name */}
          <div className="flex flex-col items-center gap-3">
            <Image
              src="/Logo.png"
              alt="Yos Fitness Studio"
              width={72}
              height={72}
              className="h-16 w-auto object-contain"
            />
            <div>
              <p className="text-white font-black text-xl uppercase tracking-widest leading-none">
                Yos Fitness Studio
              </p>
              <p className="text-orange-400/60 text-xs uppercase tracking-[0.2em] mt-1">
                Mylapore, Chennai
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px" style={{ background: "rgba(249,115,22,0.15)" }} />

          {/* Heading */}
          <div>
            <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">
              Staff Attendance
            </p>
            <h1 className="text-white font-black text-3xl uppercase tracking-tight leading-tight">
              Scan to Sign In<br />& Sign Out
            </h1>
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-green-400 text-[11px] font-bold uppercase tracking-wider">Sign In</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-orange-400 text-[11px] font-bold uppercase tracking-wider">Sign Out</span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: "#ffffff" }}
          >
            <QRCode
              value={CHECKIN_URL}
              size={200}
              bgColor="#ffffff"
              fgColor="#111111"
              level="H"
            />
          </div>

          {/* URL hint */}
          <div>
            <p className="text-gray-500 text-xs mb-1">or visit</p>
            <p className="text-orange-400 text-sm font-bold tracking-wide">
              yosfitnessstudio.in/checkin
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px" style={{ background: "rgba(249,115,22,0.10)" }} />

          {/* Footer instruction */}
          <div className="space-y-1.5">
            <p className="text-gray-400 text-xs leading-relaxed">
              Scan with your phone camera and enter<br />
              your 4-digit PIN at the start and end of every shift.
            </p>
            <p className="text-gray-600 text-[10px] uppercase tracking-widest">
              Do this every shift without fail
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }

          @page {
            size: A4;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }

          .poster {
            min-height: 100vh;
            background: #0c0c0c !important;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .poster-card {
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  );
}
