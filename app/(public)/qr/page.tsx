"use client";

import QRCode from "react-qr-code";
import { Dumbbell, Printer } from "lucide-react";
import { REGISTRATION_FORM_URL, GYM_NAME, GYM_LOCATION } from "@/lib/site-config";

export default function QRPage() {
  const hasForm = !!REGISTRATION_FORM_URL;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      {/* Print button — hidden when printing */}
      <button
        onClick={() => window.print()}
        className="print:hidden fixed top-6 right-6 flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors shadow-lg"
      >
        <Printer className="h-4 w-4" />
        Print / Save as PDF
      </button>

      {/* Printable card */}
      <div className="w-full max-w-sm text-center space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-orange-500 rounded-2xl p-4 shadow-xl shadow-orange-200">
            <Dumbbell className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{GYM_NAME}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{GYM_LOCATION}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100" />

        {/* Heading */}
        <div>
          <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2">New Member?</p>
          <h2 className="text-xl font-extrabold text-gray-900 leading-snug">
            Scan to fill the<br />Registration Form
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Takes less than 2 minutes
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-5 bg-white border-4 border-gray-900 rounded-3xl shadow-2xl">
            {hasForm ? (
              <QRCode
                value={REGISTRATION_FORM_URL}
                size={220}
                bgColor="#ffffff"
                fgColor="#111827"
              />
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 text-center px-4">
                  Form URL not configured yet.<br />Add <code>NEXT_PUBLIC_REGISTRATION_FORM_URL</code> in Vercel.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          {[
            { step: "1", text: "Open your phone camera" },
            { step: "2", text: "Point at the QR code" },
            { step: "3", text: "Fill the form & submit" },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0">
                {step}
              </div>
              <p className="text-sm text-gray-600 font-medium text-left">{text}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100" />

        {/* Footer */}
        <p className="text-xs text-gray-300">
          © {new Date().getFullYear()} {GYM_NAME} · {GYM_LOCATION}
        </p>
      </div>
    </div>
  );
}
