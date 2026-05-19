"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from "react";
import {
  Copy, Check, MessageCircle, Printer, Receipt,
  CalendarCheck, MapPin, LogOut,
} from "lucide-react";
import { REGISTRATION_FORM_URL } from "@/lib/site-config";

type Phase = "input" | "loading" | "dashboard" | "error";

interface EmployeeData {
  id: string; fullName: string; employeeId: string; role: string;
}
interface Shift {
  checkInTime: string; checkOutTime: string | null;
}
interface AttendanceData {
  status: string; shifts: Shift[];
}

const TOTAL_BOXES = 4;

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function roleLabel(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StaffDashboardPage() {
  const [phase, setPhase]       = useState<Phase>("input");
  const [digits, setDigits]     = useState<string[]>(Array(TOTAL_BOXES).fill(""));
  const [errorMsg, setErrorMsg] = useState("");
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [copied, setCopied]     = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setTimeout(() => inputs.current[0]?.focus(), 100);
  }, []);

  function handleChange(i: number, e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[i] = val; setDigits(next);
    if (val && i < TOTAL_BOXES - 1) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[i]) { const n = [...digits]; n[i] = ""; setDigits(n); }
      else if (i > 0) { inputs.current[i - 1]?.focus(); const n = [...digits]; n[i - 1] = ""; setDigits(n); }
    }
  }

  async function handleSubmit() {
    const pin = digits.join("");
    if (pin.length < TOTAL_BOXES) return;
    setPhase("loading");

    try {
      const res = await fetch("/api/staff/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Invalid PIN."); setPhase("error"); return; }
      setEmployee(data.employee);
      setAttendance(data.todayAttendance);
      setPhase("dashboard");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setPhase("error");
    }
  }

  function signOut() {
    setDigits(Array(TOTAL_BOXES).fill(""));
    setEmployee(null); setAttendance(null);
    setErrorMsg(""); setPhase("input");
    setTimeout(() => inputs.current[0]?.focus(), 100);
  }

  function copyLink() {
    if (!REGISTRATION_FORM_URL) return;
    navigator.clipboard.writeText(REGISTRATION_FORM_URL).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Hi! Please fill in this quick registration form for Yos Fitness Studio:\n${REGISTRATION_FORM_URL}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  const pinComplete = digits.every((d) => d !== "");

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  // ── PIN Entry ──────────────────────────────────────────────────────────────
  if (phase === "input" || phase === "loading" || phase === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0f0f0f" }}>
        <div className="w-full max-w-sm flex flex-col items-center">
          <Image src="/Logo.png" alt="Yos Fitness Studio" width={180} height={44}
            className="h-11 w-auto object-contain mb-8" priority />

          <h1 className="text-2xl font-bold text-white mb-1 text-center">Staff Dashboard</h1>
          <p className="text-gray-500 text-sm text-center mb-10">Enter your 4-digit PIN to continue</p>

          {phase === "error" && (
            <div className="w-full mb-6 px-4 py-3 rounded-xl text-center" style={{ background: "#2d1010" }}>
              <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          <div className="flex gap-4 mb-10">
            {digits.map((digit, i) => (
              <input key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="tel" inputMode="numeric" maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={phase === "loading"}
                className="h-16 w-16 text-center text-3xl font-bold rounded-2xl border-2 outline-none text-white transition-all"
                style={{ background: "#1a1a1a", borderColor: digit ? "#f97316" : "#2d2d2d", caretColor: "#f97316" }}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>

          <button onClick={handleSubmit}
            disabled={!pinComplete || phase === "loading"}
            className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 disabled:opacity-40 transition-opacity"
            style={{ background: "#f97316" }}>
            {phase === "loading" ? (
              <><Spinner /> Verifying...</>
            ) : "Enter Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const lastShift = attendance?.shifts?.[attendance.shifts.length - 1] ?? null;
  const isCheckedIn = !!lastShift && !lastShift.checkOutTime;
  const hasForm = !!REGISTRATION_FORM_URL;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <Image src="/Logo.png" alt="Yos Fitness Studio" width={120} height={30}
          className="h-8 w-auto object-contain" priority />
        <button onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>

      <div className="flex-1 flex flex-col px-4 pb-10 gap-4 w-full max-w-sm mx-auto pt-4">

        {/* Welcome */}
        <div className="rounded-2xl p-5" style={{ background: "#f97316" }}>
          <p className="text-orange-100 text-sm font-medium">{greeting},</p>
          <h2 className="text-2xl font-extrabold text-white mt-0.5">{employee?.fullName} 👋</h2>
          <p className="text-orange-200 text-xs mt-1">{roleLabel(employee?.role ?? "")} · Yos Fitness Studio</p>
        </div>

        {/* Today's Attendance */}
        <div className="rounded-2xl p-5" style={{ background: "#1a1a1a" }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Today's Attendance</p>

          {!attendance || attendance.status === "ABSENT" || attendance.status === "WEEKLY_OFF" ? (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-600 flex-shrink-0" />
              <p className="text-gray-400 text-sm">Not checked in yet</p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {attendance.shifts.map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "#111" }}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.checkOutTime ? "bg-gray-500" : "bg-green-400"}`} />
                  <div className="flex-1">
                    <span className="text-green-400 text-sm font-semibold">▲ {fmt(s.checkInTime)}</span>
                    {s.checkOutTime && (
                      <span className="text-gray-500 text-sm"> &nbsp;▼ {fmt(s.checkOutTime)}</span>
                    )}
                  </div>
                  {!s.checkOutTime && (
                    <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Active</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Link href="/checkin"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ background: isCheckedIn ? "#7f1d1d" : "#166534" }}>
            <MapPin className="h-4 w-4" />
            {isCheckedIn ? "Check Out at Gym" : "Check In at Gym"}
            <span className="text-xs font-normal opacity-60 ml-1">· requires GPS</span>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl p-5" style={{ background: "#1a1a1a" }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/payments/new"
              className="flex flex-col items-center gap-2 rounded-xl py-4 px-3 transition-colors text-center"
              style={{ background: "#111" }}>
              <div className="bg-orange-500/15 rounded-xl p-2.5">
                <Receipt className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-white text-xs font-bold">New Receipt</p>
                <p className="text-gray-600 text-[10px] mt-0.5">Record payment</p>
              </div>
            </Link>

            <Link href="/my-attendance"
              className="flex flex-col items-center gap-2 rounded-xl py-4 px-3 transition-colors text-center"
              style={{ background: "#111" }}>
              <div className="bg-blue-500/15 rounded-xl p-2.5">
                <CalendarCheck className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white text-xs font-bold">My Attendance</p>
                <p className="text-gray-600 text-[10px] mt-0.5">View history</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Registration Form */}
        <div className="rounded-2xl p-5" style={{ background: "#1a1a1a" }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Member Registration</p>
          <p className="text-white text-sm font-semibold mb-4">Share form with a new member</p>

          {!hasForm ? (
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#111" }}>
              <p className="text-gray-500 text-xs">Form not configured yet — contact admin</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-xl">
                  <QRCode value={REGISTRATION_FORM_URL} size={150} bgColor="#ffffff" fgColor="#111827" />
                </div>
              </div>
              <div className="space-y-2">
                <button onClick={shareWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#1ebe5d" }}>
                  <MessageCircle className="h-4 w-4" />
                  Send via WhatsApp
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={copyLink}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                    style={{ background: "#111", color: "#d1d5db" }}>
                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  <Link href="/qr" target="_blank"
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                    style={{ background: "#111", color: "#d1d5db" }}>
                    <Printer className="h-3.5 w-3.5" />
                    Print QR
                  </Link>
                </div>
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
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
