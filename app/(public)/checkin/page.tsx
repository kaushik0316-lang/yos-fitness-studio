"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useRef, useState, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { Copy, Check, MessageCircle, Printer, QrCode } from "lucide-react";
import { REGISTRATION_FORM_URL } from "@/lib/site-config";

type Phase = "input" | "locating" | "loading" | "success" | "error" | "cooldown";

interface SuccessData {
  action: "checkin" | "checkout";
  employeeName: string;
  time: string;
  shiftNumber?: number;
}

const TOTAL_BOXES   = 4;
const MIN_DIGITS    = 4;
const COOLDOWN_SECS = 120;

export default function StaffDashboardPage() {
  const [digits, setDigits]       = useState<string[]>(Array(TOTAL_BOXES).fill(""));
  const [phase, setPhase]         = useState<Phase>("input");
  const [successData, setSuccess] = useState<SuccessData | null>(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [countdown, setCountdown] = useState(0);
  const [copied, setCopied]       = useState(false);
  const inputs   = useRef<(HTMLInputElement | null)[]>([]);
  const deviceId = useRef<string>("");

  useEffect(() => {
    let id = localStorage.getItem("kiosk_device_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("kiosk_device_id", id); }
    deviceId.current = id;
  }, []);

  useEffect(() => {
    if (phase !== "cooldown") return;
    if (countdown <= 0) { resetForm(); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  function resetForm() {
    setDigits(Array(TOTAL_BOXES).fill(""));
    setPhase("input");
    setSuccess(null);
    setErrorMsg("");
    setCountdown(0);
    setTimeout(() => inputs.current[0]?.focus(), 50);
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    if (val && index < TOTAL_BOXES - 1) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits]; next[index] = ""; setDigits(next);
      } else if (index > 0) {
        inputs.current[index - 1]?.focus();
        const next = [...digits]; next[index - 1] = ""; setDigits(next);
      }
    }
  }

  async function handleSubmit() {
    let pin = "";
    for (const d of digits) { if (!d) break; pin += d; }
    if (pin.length < MIN_DIGITS) return;
    setPhase("locating");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setPhase("loading");
        try {
          const res = await fetch("/api/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin, lat: pos.coords.latitude, lng: pos.coords.longitude, deviceId: deviceId.current }),
          });
          const data = await res.json();
          if (!res.ok) { setErrorMsg(data.error ?? "Something went wrong."); setPhase("error"); }
          else {
            setSuccess({ action: data.action, employeeName: data.employee.fullName, time: data.time, shiftNumber: data.shiftNumber });
            setPhase("success");
            setCountdown(COOLDOWN_SECS);
          }
        } catch { setErrorMsg("Network error. Check your connection and try again."); setPhase("error"); }
      },
      (err) => {
        const msg = err.code === 1
          ? "Location permission denied. Please allow location access and try again."
          : "Could not get your location. Please enable GPS and try again.";
        setErrorMsg(msg); setPhase("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function copyLink() {
    if (!REGISTRATION_FORM_URL) return;
    navigator.clipboard.writeText(REGISTRATION_FORM_URL).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(`Hi! Please fill in this quick registration form for Yos Fitness Studio:\n${REGISTRATION_FORM_URL}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  const pinComplete = digits.slice(0, MIN_DIGITS).every((d) => d !== "");

  // ─── Cooldown screen ───────────────────────────────────────────────────────
  if (phase === "cooldown") {
    const pct = Math.round((countdown / COOLDOWN_SECS) * 283);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0f0f0f" }}>
        <div className="w-full max-w-sm text-center">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a1a" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" strokeWidth="8"
                strokeDasharray="283" strokeDashoffset={283 - pct} strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-extrabold text-white">{countdown}</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Next person, please wait</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            This ensures each staff member checks in themselves.
          </p>
          <button onClick={resetForm}
            className="w-full py-4 rounded-xl font-semibold text-base transition-opacity"
            style={{ background: "#1a1a1a", color: "#6b7280" }}>
            Skip ({countdown}s)
          </button>
        </div>
      </div>
    );
  }

  // ─── Main dashboard ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f" }}>

      {/* Header */}
      <div className="flex flex-col items-center pt-8 pb-4 px-4">
        <Image src="/Logo.png" alt="Yos Fitness Studio" width={160} height={40}
          className="h-10 w-auto object-contain mb-3" priority />
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Staff Dashboard</p>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-10 gap-4 w-full max-w-sm mx-auto">

        {/* ── Attendance Card ── */}
        <div className="w-full rounded-2xl p-6" style={{ background: "#1a1a1a" }}>

          {/* Input / Locating / Loading */}
          {(phase === "input" || phase === "locating" || phase === "loading") && (
            <>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Attendance</p>
              <p className="text-white font-semibold text-sm mb-6">Enter your 4-digit PIN</p>
              <div className="flex gap-3 justify-center mb-6">
                {digits.map((digit, i) => (
                  <input key={i}
                    ref={(el) => { inputs.current[i] = el; }}
                    type="tel" inputMode="numeric" maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={phase === "locating" || phase === "loading"}
                    className="h-14 w-14 text-center text-2xl font-bold rounded-xl border-2 outline-none text-white transition-colors"
                    style={{ background: "#111", borderColor: digit ? "#dc2626" : "#374151", caretColor: "#dc2626" }}
                    onFocus={(e) => e.target.select()}
                  />
                ))}
              </div>
              <button onClick={handleSubmit}
                disabled={!pinComplete || phase === "locating" || phase === "loading"}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                style={{ background: "#dc2626" }}>
                {phase === "locating" && <><Spinner /> Getting location...</>}
                {phase === "loading" && <><Spinner /> Marking attendance...</>}
                {phase === "input" && "Mark Attendance"}
              </button>
            </>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="text-center">
              <div className="text-5xl mb-4">❌</div>
              <p className="text-white font-bold mb-2">Something went wrong</p>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">{errorMsg}</p>
              <button onClick={resetForm}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm"
                style={{ background: "#dc2626" }}>
                Try Again
              </button>
            </div>
          )}

          {/* Success */}
          {phase === "success" && successData && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">{successData.action === "checkin" ? "✅" : "🔴"}</div>
                <div>
                  <p className="text-white font-bold text-base leading-tight">{successData.employeeName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: successData.action === "checkin" ? "#166534" : "#7f1d1d", color: successData.action === "checkin" ? "#4ade80" : "#f87171" }}>
                      {successData.action === "checkin" ? "Checked In" : "Checked Out"}
                    </span>
                    {successData.shiftNumber && successData.shiftNumber > 1 && (
                      <span className="text-xs text-gray-500">Shift {successData.shiftNumber}</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-5">{successData.time}</p>
              <div className="flex gap-2">
                <Link href="/my-attendance"
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center transition-colors"
                  style={{ background: "#111", color: "#9ca3af" }}>
                  My Attendance →
                </Link>
                <button onClick={() => setPhase("cooldown")}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-colors"
                  style={{ background: "#dc2626" }}>
                  Done · Next Person
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Registration Form Card ── */}
        <div className="w-full rounded-2xl p-6" style={{ background: "#1a1a1a" }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Member Registration</p>
          <p className="text-white font-semibold text-sm mb-4">New member? Share the form</p>

          {!REGISTRATION_FORM_URL ? (
            <div className="flex items-center gap-3 bg-black/30 rounded-xl p-4">
              <QrCode className="h-8 w-8 text-gray-600 flex-shrink-0" />
              <div>
                <p className="text-gray-400 text-xs font-medium">Form URL not set up yet</p>
                <p className="text-gray-600 text-xs mt-0.5">Admin: add NEXT_PUBLIC_REGISTRATION_FORM_URL in Vercel</p>
              </div>
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-xl">
                  <QRCode value={REGISTRATION_FORM_URL} size={140} bgColor="#ffffff" fgColor="#111827" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={copyLink}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: "#111", color: "#d1d5db" }}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>

                <button onClick={shareWhatsApp}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-colors"
                  style={{ background: "#1ebe5d" }}>
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>

                <Link href="/qr" target="_blank"
                  className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: "#111", color: "#d1d5db" }}>
                  <Printer className="h-3.5 w-3.5" />
                  Print QR Code
                </Link>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
