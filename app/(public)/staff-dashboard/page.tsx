"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from "react";
import {
  Copy, Check, MessageCircle, Printer,
  Receipt, CalendarCheck, LogOut, ChevronRight,
} from "lucide-react";
import { REGISTRATION_FORM_URL } from "@/lib/site-config";

type Phase = "input" | "loading" | "dashboard" | "error";

interface EmployeeData {
  id: string; fullName: string; employeeId: string; role: string;
}
interface Shift { checkInTime: string; checkOutTime: string | null; }
interface AttendanceData { status: string; shifts: Shift[]; }

const TOTAL_BOXES = 4;

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });
}

function roleLabel(role: string) {
  return role.replace(/_/g, " ").toUpperCase();
}

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata",
  });
}

export default function StaffDashboardPage() {
  const [phase, setPhase]           = useState<Phase>("input");
  const [digits, setDigits]         = useState<string[]>(Array(TOTAL_BOXES).fill(""));
  const [errorMsg, setErrorMsg]     = useState("");
  const [employee, setEmployee]     = useState<EmployeeData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [copied, setCopied]         = useState(false);
  const [pin, setPin]               = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("staff_pin");
    if (stored) {
      // Already authenticated — restore session silently
      setDigits(stored.split(""));
      setPhase("loading");
      fetch("/api/staff/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: stored }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.employee) {
            setEmployee(data.employee);
            setAttendance(data.todayAttendance);
            setPin(stored);
            setPhase("dashboard");
          } else {
            // Stored PIN no longer valid — clear and show input
            sessionStorage.removeItem("staff_pin");
            setDigits(Array(TOTAL_BOXES).fill(""));
            setPhase("input");
            setTimeout(() => inputs.current[0]?.focus(), 100);
          }
        })
        .catch(() => {
          sessionStorage.removeItem("staff_pin");
          setDigits(Array(TOTAL_BOXES).fill(""));
          setPhase("input");
          setTimeout(() => inputs.current[0]?.focus(), 100);
        });
    } else {
      setTimeout(() => inputs.current[0]?.focus(), 100);
    }
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
    if (e.key === "Enter" && digits.every((d) => d)) handleSubmit();
  }

  async function handleSubmit() {
    const enteredPin = digits.join("");
    if (enteredPin.length < TOTAL_BOXES) return;
    setPhase("loading");
    try {
      const res = await fetch("/api/staff/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: enteredPin }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Invalid PIN."); setPhase("error"); return; }
      setEmployee(data.employee);
      setAttendance(data.todayAttendance);
      setPin(enteredPin);
      // Save PIN to sessionStorage so My Attendance auto-loads
      sessionStorage.setItem("staff_pin", enteredPin);
      setPhase("dashboard");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setPhase("error");
    }
  }

  function signOut() {
    sessionStorage.removeItem("staff_pin");
    setDigits(Array(TOTAL_BOXES).fill(""));
    setEmployee(null); setAttendance(null);
    setErrorMsg(""); setPin(""); setPhase("input");
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
  const hasForm = !!REGISTRATION_FORM_URL;

  // ── PIN Entry ──────────────────────────────────────────────────────────────
  if (phase === "input" || phase === "loading" || phase === "error") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
        {/* Top bar */}
        <div className="flex items-center justify-center pt-10 pb-2">
          <Image src="/Logo.png" alt="Yos Fitness Studio" width={140} height={36}
            className="h-9 w-auto object-contain" priority />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <div className="w-full max-w-xs">
            {/* Heading */}
            <div className="text-center mb-10">
              <h1 className="text-2xl font-extrabold text-white">Staff Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">Enter your PIN to continue</p>
            </div>

            {/* Error */}
            {phase === "error" && (
              <div className="mb-6 px-4 py-3 rounded-2xl text-center border"
                style={{ background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.2)" }}>
                <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
              </div>
            )}

            {/* PIN boxes */}
            <div className="flex gap-3 justify-center mb-8">
              {digits.map((digit, i) => (
                <input key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="tel" inputMode="numeric" maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={phase === "loading"}
                  className="h-16 w-16 text-center text-3xl font-bold rounded-2xl border-2 outline-none text-white transition-all"
                  style={{
                    background: "#1c1c1c",
                    borderColor: digit ? "#f97316" : "#2a2a2a",
                    caretColor: "#f97316",
                  }}
                  onFocus={(e) => e.target.select()}
                />
              ))}
            </div>

            {/* Submit */}
            <button onClick={handleSubmit}
              disabled={!pinComplete || phase === "loading"}
              className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 disabled:opacity-30 transition-opacity"
              style={{ background: "#f97316" }}>
              {phase === "loading" ? <><Spinner /> Verifying...</> : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const lastShift = attendance?.shifts?.[attendance.shifts.length - 1] ?? null;
  const isCheckedIn = !!lastShift && !lastShift.checkOutTime;
  const hasAttendance = attendance && attendance.shifts.length > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1c1c1c" }}>
        <Image src="/Logo.png" alt="Yos Fitness Studio" width={110} height={28}
          className="h-7 w-auto object-contain" priority />
        <button onClick={signOut}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "#6b7280", background: "#1c1c1c" }}>
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </div>

      <div className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col gap-4">

        {/* Welcome card */}
        <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: "#f97316" }}>
          {/* Background pattern */}
          <div className="absolute right-4 top-4 text-8xl opacity-10 select-none font-black">YOS</div>
          <p className="text-orange-100 text-xs font-semibold uppercase tracking-widest">{todayLabel()}</p>
          <h2 className="text-2xl font-extrabold text-white mt-1 leading-tight">
            {(employee?.fullName ?? "").toUpperCase()} 👋
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-orange-200"
              style={{ background: "rgba(0,0,0,0.15)" }}>
              {roleLabel(employee?.role ?? "")}
            </span>
            <span className="text-orange-200 text-[11px]">{employee?.employeeId}</span>
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="rounded-3xl p-5" style={{ background: "#1c1c1c" }}>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#4b5563" }}>
            Today's Attendance
          </p>

          {!hasAttendance ? (
            <div className="flex items-center gap-3 py-1 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#2a2a2a" }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#374151" }} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Not checked in yet</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>Use Check In from the Staff Portal menu</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {attendance!.shifts.map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: "#111" }}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.checkOutTime ? "" : "animate-pulse"}`}
                    style={{ background: s.checkOutTime ? "#374151" : "#22c55e" }} />
                  <div className="flex-1">
                    <span className="text-sm font-semibold" style={{ color: "#4ade80" }}>
                      ▲ {fmt(s.checkInTime)}
                    </span>
                    {s.checkOutTime && (
                      <span className="text-sm ml-3" style={{ color: "#6b7280" }}>
                        ▼ {fmt(s.checkOutTime)}
                      </span>
                    )}
                  </div>
                  {!s.checkOutTime && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)" }}>
                      Active
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Status pill */}
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? "bg-green-400" : "bg-gray-600"}`} />
            <p className="text-xs" style={{ color: "#6b7280" }}>
              {isCheckedIn
                ? "You are currently checked in"
                : hasAttendance
                ? "All shifts completed for today"
                : "No attendance recorded today"}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/payments/new"
            className="flex flex-col gap-3 rounded-3xl p-5 transition-opacity active:opacity-70"
            style={{ background: "#1c1c1c" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(249,115,22,0.15)" }}>
              <Receipt className="h-6 w-6" style={{ color: "#f97316" }} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">New Receipt</p>
              <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Record a payment</p>
            </div>
            <ChevronRight className="h-4 w-4 self-end" style={{ color: "#374151" }} />
          </Link>

          <Link href={`/my-attendance`}
            className="flex flex-col gap-3 rounded-3xl p-5 transition-opacity active:opacity-70"
            style={{ background: "#1c1c1c" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.15)" }}>
              <CalendarCheck className="h-6 w-6" style={{ color: "#60a5fa" }} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">My Attendance</p>
              <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>View shift history</p>
            </div>
            <ChevronRight className="h-4 w-4 self-end" style={{ color: "#374151" }} />
          </Link>
        </div>

        {/* Registration Form */}
        <div className="rounded-3xl p-5" style={{ background: "#1c1c1c" }}>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "#4b5563" }}>
            Member Registration
          </p>
          <p className="text-white text-sm font-semibold mb-4">Share form with a new member</p>

          {!hasForm ? (
            <div className="rounded-2xl px-4 py-4 text-center" style={{ background: "#111" }}>
              <p className="text-xs font-medium" style={{ color: "#6b7280" }}>
                Form not configured yet — contact admin
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-2xl" style={{ background: "#fff" }}>
                  <QRCode value={REGISTRATION_FORM_URL} size={148} bgColor="#ffffff" fgColor="#111827" />
                </div>
              </div>
              <div className="space-y-2">
                <button onClick={shareWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white"
                  style={{ background: "#1ebe5d" }}>
                  <MessageCircle className="h-4 w-4" />
                  Send via WhatsApp
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={copyLink}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-semibold transition-colors"
                    style={{ background: "#111", color: "#9ca3af" }}>
                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  <Link href="/qr" target="_blank"
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-semibold"
                    style={{ background: "#111", color: "#9ca3af" }}>
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
