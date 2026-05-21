"use client";

import Link from "next/link";
import QRCode from "react-qr-code";
import { useState, useEffect, useRef } from "react";
import {
  Copy, Check, MessageCircle, Printer,
  Receipt, CalendarCheck, LogOut, ChevronRight,
  Delete, Dumbbell,
} from "lucide-react";
import { REGISTRATION_FORM_URL } from "@/lib/site-config";

type Phase = "input" | "loading" | "dashboard" | "error";

interface EmployeeData {
  id: string; fullName: string; employeeId: string; role: string;
}
interface Shift { checkInTime: string; checkOutTime: string | null; }
interface AttendanceData { status: string; shifts: Shift[]; }

const TOTAL_DIGITS = 4;
const NUMPAD_KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

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
  const [pin, setPin]               = useState("");
  const [errorMsg, setErrorMsg]     = useState("");
  const [employee, setEmployee]     = useState<EmployeeData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [copied, setCopied]         = useState(false);
  const [shaking, setShaking]       = useState(false);
  const submittingRef               = useRef(false);

  // Restore session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("staff_pin");
    if (stored) {
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
            sessionStorage.removeItem("staff_pin");
            setPhase("input");
          }
        })
        .catch(() => {
          sessionStorage.removeItem("staff_pin");
          setPhase("input");
        });
    }
  }, []);

  async function submit(enteredPin: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase("loading");
    try {
      const res = await fetch("/api/staff/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: enteredPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Invalid PIN. Try again.");
        setPin("");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        setPhase("error");
        return;
      }
      setEmployee(data.employee);
      setAttendance(data.todayAttendance);
      setPin(enteredPin);
      sessionStorage.setItem("staff_pin", enteredPin);
      setPhase("dashboard");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setPin("");
      setPhase("error");
    } finally {
      submittingRef.current = false;
    }
  }

  function pressKey(key: string) {
    if (phase === "loading") return;
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      if (phase === "error") setPhase("input");
      setErrorMsg("");
      return;
    }
    setPin((prev) => {
      if (prev.length >= TOTAL_DIGITS) return prev;
      const next = prev + key;
      if (next.length === TOTAL_DIGITS) {
        setTimeout(() => submit(next), 60);
      }
      return next;
    });
    if (phase === "error") { setPhase("input"); setErrorMsg(""); }
  }

  // Physical keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === "loading" || phase === "dashboard") return;
      if (e.key >= "0" && e.key <= "9") pressKey(e.key);
      if (e.key === "Backspace") pressKey("⌫");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function signOut() {
    sessionStorage.removeItem("staff_pin");
    setPin(""); setEmployee(null); setAttendance(null);
    setErrorMsg(""); setPhase("input"); submittingRef.current = false;
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

  const hasForm = !!REGISTRATION_FORM_URL;

  // ── PIN ENTRY ─────────────────────────────────────────────────────────────
  if (phase !== "dashboard") {
    return (
      <div
        className="min-h-screen flex flex-col relative overflow-hidden select-none"
        style={{ background: "linear-gradient(150deg, #0c0c0c 0%, #110800 55%, #1a0c00 100%)" }}
      >
        {/* Mesh glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full opacity-[0.18]"
            style={{ background: "radial-gradient(circle, #f97316 0%, transparent 65%)" }} />
          <div className="absolute -bottom-48 -right-24 w-[440px] h-[440px] rounded-full opacity-[0.14]"
            style={{ background: "radial-gradient(circle, #ea580c 0%, transparent 65%)" }} />
        </div>
        {/* Dot-grid texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Logo bar */}
        <div className="relative flex items-center justify-center pt-10 pb-2">
          <div className="flex items-center gap-3">
            <div
              className="rounded-2xl p-2.5 shadow-xl"
              style={{
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                boxShadow: "0 6px 24px -4px rgba(249,115,22,0.5)",
              }}
            >
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-lg leading-none uppercase tracking-wide">
                Yos Fitness Studio
              </p>
              <p className="text-orange-400/50 text-[10px] mt-0.5 uppercase tracking-[0.2em]">
                Mylapore, Chennai
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-6 pb-6">
          <div className="w-full max-w-[300px]">

            {/* Heading */}
            <div className="text-center mb-8">
              <p className="text-orange-400/70 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">
                {todayLabel()}
              </p>
              <h1 className="text-2xl font-extrabold text-white uppercase tracking-wide">
                Staff Login
              </h1>
              <p className="text-gray-500 text-sm mt-1.5">Enter your 4-digit PIN</p>
            </div>

            {/* PIN dots */}
            <div
              className="flex gap-3.5 justify-center mb-2"
              style={{
                animation: shaking ? "shake 0.45s ease-in-out" : "none",
              }}
            >
              {Array.from({ length: TOTAL_DIGITS }).map((_, i) => {
                const filled = i < pin.length;
                return (
                  <div
                    key={i}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-150"
                    style={{
                      background: filled ? "rgba(249,115,22,0.12)" : "#161616",
                      borderColor: filled ? "#f97316" : i === pin.length ? "#3a3a3a" : "#222222",
                      boxShadow: filled ? "0 0 20px rgba(249,115,22,0.2)" : "none",
                    }}
                  >
                    {filled && (
                      <div className="w-3.5 h-3.5 rounded-full"
                        style={{ background: "linear-gradient(135deg, #fb923c, #f97316)" }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Error */}
            <div className="h-10 flex items-center justify-center mb-3">
              {(phase === "error") && (
                <p className="text-red-400 text-sm font-medium text-center">{errorMsg}</p>
              )}
              {phase === "loading" && (
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span className="text-gray-500 text-sm">Verifying…</span>
                </div>
              )}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2.5">
              {NUMPAD_KEYS.map((key, i) => {
                if (key === "") return <div key={i} />;
                const isBackspace = key === "⌫";
                return (
                  <button
                    key={i}
                    onClick={() => pressKey(key)}
                    disabled={phase === "loading"}
                    className="h-[68px] rounded-2xl flex items-center justify-center font-bold text-2xl transition-all duration-100 active:scale-90 disabled:opacity-30"
                    style={{
                      background: isBackspace ? "transparent" : "#1e1e1e",
                      color: isBackspace ? "#6b7280" : "#ffffff",
                      border: isBackspace ? "none" : "1px solid #2e2e2e",
                      boxShadow: isBackspace ? "none" : "0 2px 8px rgba(0,0,0,0.4)",
                    }}
                  >
                    {isBackspace ? <Delete className="h-5 w-5" /> : key}
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(6px); }
          }
        `}</style>
      </div>
    );
  }

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  const lastShift     = attendance?.shifts?.[attendance.shifts.length - 1] ?? null;
  const isCheckedIn   = !!lastShift && !lastShift.checkOutTime;
  const hasAttendance = attendance && attendance.shifts.length > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1c1c1c" }}>
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 rounded-lg p-1.5">
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm uppercase tracking-wide">Yos Fitness</span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "#6b7280", background: "#1c1c1c" }}
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </div>

      <div className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col gap-4">

        {/* Welcome card */}
        <div
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}
        >
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
                <p className="text-xs" style={{ color: "#6b7280" }}>Use Sign In from the Staff Portal menu</p>
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

          <Link href="/my-attendance"
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
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-semibold"
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
    <svg className="animate-spin h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
