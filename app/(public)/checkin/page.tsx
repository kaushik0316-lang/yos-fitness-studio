"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect, KeyboardEvent, ChangeEvent } from "react";

type Phase = "input" | "locating" | "loading" | "success" | "error" | "cooldown";

interface SuccessData {
  action: "checkin" | "checkout";
  employeeName: string;
  time: string;
  shiftNumber?: number;
}

const TOTAL_BOXES    = 4;
const MIN_DIGITS     = 4;
const COOLDOWN_SECS  = 120; // seconds to wait between different employees

export default function CheckInPage() {
  const [digits, setDigits] = useState<string[]>(Array(TOTAL_BOXES).fill(""));
  const [phase, setPhase] = useState<Phase>("input");
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [countdown, setCountdown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const deviceId = useRef<string>("");

  // Generate or load a persistent device ID from localStorage
  useEffect(() => {
    let id = localStorage.getItem("kiosk_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("kiosk_device_id", id);
    }
    deviceId.current = id;
  }, []);

  // Countdown timer for cooldown phase
  useEffect(() => {
    if (phase !== "cooldown") return;
    if (countdown <= 0) { resetForm(); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  function resetForm() {
    setDigits(Array(TOTAL_BOXES).fill(""));
    setPhase("input");
    setSuccessData(null);
    setErrorMsg("");
    setCountdown(0);
    setTimeout(() => inputs.current[0]?.focus(), 50);
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    if (val && index < TOTAL_BOXES - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        inputs.current[index - 1]?.focus();
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
      }
    }
  }

  async function handleSubmit() {
    // Collect only leading filled digits (stop at first empty box)
    let pin = "";
    for (const d of digits) {
      if (!d) break;
      pin += d;
    }
    if (pin.length < MIN_DIGITS) return;

    setPhase("locating");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPhase("loading");
        try {
          const res = await fetch("/api/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin, lat, lng, deviceId: deviceId.current }),
          });
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error ?? "Something went wrong.");
            setPhase("error");
          } else {
            setSuccessData({
              action: data.action,
              employeeName: data.employee.fullName,
              time: data.time,
              shiftNumber: data.shiftNumber,
            });
            setPhase("success");
            // Start cooldown so the next person must wait before entering a different PIN
            setCountdown(COOLDOWN_SECS);
          }
        } catch {
          setErrorMsg("Network error. Check your connection and try again.");
          setPhase("error");
        }
      },
      (err) => {
        let msg = "Could not get your location. Please enable GPS and try again.";
        if (err.code === 1) msg = "Location permission denied. Please allow location access and try again.";
        setErrorMsg(msg);
        setPhase("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Enable submit once the first MIN_DIGITS boxes are filled
  const pinComplete = digits.slice(0, MIN_DIGITS).every((d) => d !== "");

  // ─── Success screen ────────────────────────────────────────────────────────
  if (phase === "success" && successData) {
    const isCheckin = successData.action === "checkin";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0f0f0f" }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-7xl mb-6">✅</div>
          <div
            className="inline-block px-5 py-2 rounded-full text-white font-bold text-sm uppercase tracking-widest mb-6"
            style={{ background: isCheckin ? "#16a34a" : "#dc2626" }}
          >
            {isCheckin ? "Checked In" : "Checked Out"}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{successData.employeeName}</h2>
          {successData.shiftNumber && successData.shiftNumber > 1 && (
            <p className="text-gray-500 text-sm mb-1">Shift {successData.shiftNumber}</p>
          )}
          <p className="text-gray-400 text-lg mb-8">{successData.time}</p>
          <Link
            href="/my-attendance"
            className="block w-full py-3 rounded-xl font-semibold text-center text-sm mb-3"
            style={{ background: "#1a1a1a", color: "#9ca3af" }}
          >
            View My Attendance →
          </Link>
          <button
            onClick={() => setPhase("cooldown")}
            className="w-full py-4 rounded-xl font-semibold text-white text-base"
            style={{ background: "#dc2626" }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ─── Cooldown screen (prevents proxy check-ins) ────────────────────────────
  if (phase === "cooldown") {
    const pct = Math.round((countdown / COOLDOWN_SECS) * 283); // stroke-dashoffset for circle
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0f0f0f" }}>
        <div className="w-full max-w-sm text-center">
          {/* Countdown ring */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a1a" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="#dc2626" strokeWidth="8"
                strokeDasharray="283"
                strokeDashoffset={283 - pct}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-extrabold text-white">{countdown}</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Next person, please wait</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            This helps ensure each staff member checks in themselves.
          </p>
          <button
            onClick={resetForm}
            className="w-full py-4 rounded-xl font-semibold text-base transition-opacity"
            style={{ background: "#1a1a1a", color: "#6b7280" }}
          >
            Skip ({countdown}s)
          </button>
        </div>
      </div>
    );
  }

  // ─── Error screen ──────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0f0f0f" }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-7xl mb-6">❌</div>
          <h2 className="text-xl font-bold text-white mb-4">Oops!</h2>
          <p className="text-gray-300 text-base mb-10 leading-relaxed">{errorMsg}</p>
          <button
            onClick={resetForm}
            className="w-full py-4 rounded-xl font-semibold text-white text-base"
            style={{ background: "#dc2626" }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Main input screen ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0f0f0f" }}>
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <Image
          src="/Logo.png"
          alt="Yos Fitness Studio"
          width={200}
          height={48}
          className="h-12 w-auto object-contain mb-8"
          priority
        />

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Staff Attendance</h1>
        <p className="text-gray-400 text-base text-center mb-10">
          Enter your 4-digit PIN to check in or out
        </p>

        {/* PIN boxes */}
        <div className="flex gap-4 mb-10">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={phase === "locating" || phase === "loading"}
              className="h-14 w-14 text-center text-2xl font-bold rounded-xl border-2 outline-none text-white transition-colors"
              style={{
                background: "#1a1a1a",
                borderColor: digit ? "#dc2626" : "#374151",
                caretColor: "#dc2626",
              }}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!pinComplete || phase === "locating" || phase === "loading"}
          className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-3 transition-opacity disabled:opacity-50"
          style={{ background: "#dc2626" }}
        >
          {phase === "locating" && (
            <>
              <Spinner />
              Getting location...
            </>
          )}
          {phase === "loading" && (
            <>
              <Spinner />
              Marking attendance...
            </>
          )}
          {(phase === "input") && "Mark Attendance"}
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
