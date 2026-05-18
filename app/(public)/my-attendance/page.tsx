"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, KeyboardEvent, ChangeEvent } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = "input" | "loading" | "view" | "error";

type AttendanceRecord = {
  date: string; // "2026-05-01"
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
};

type Summary = {
  PRESENT: number;
  ABSENT: number;
  HALF_DAY: number;
  WEEKLY_OFF: number;
  LEAVE: number;
  PAID_LEAVE: number;
};

type EmployeeData = {
  employee: { fullName: string; employeeId: string; role: string };
  month: number;
  year: number;
  summary: Summary;
  records: AttendanceRecord[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PRESENT:    { label: "Present",    color: "#16a34a", bg: "rgba(22,163,74,0.15)" },
  ABSENT:     { label: "Absent",     color: "#dc2626", bg: "rgba(220,38,38,0.15)" },
  HALF_DAY:   { label: "Half Day",   color: "#d97706", bg: "rgba(217,119,6,0.15)" },
  WEEKLY_OFF: { label: "Weekly Off", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  LEAVE:      { label: "Leave",      color: "#2563eb", bg: "rgba(37,99,235,0.15)" },
  PAID_LEAVE: { label: "Paid Leave", color: "#7c3aed", bg: "rgba(124,58,237,0.15)" },
};

const ROLE_LABELS: Record<string, string> = {
  FRONT_DESK: "Front Desk", TRAINER: "Trainer",
  CLEANER: "Cleaner", MANAGER: "Manager", ADMIN: "Admin",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr);
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MyAttendancePage() {
  const today = new Date();
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [phase, setPhase] = useState<Phase>("input");
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState<EmployeeData | null>(null);
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [savedPin, setSavedPin] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // ── PIN input handlers ────────────────────────────────────────────────────

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    if (val && index < 3) inputs.current[index + 1]?.focus();
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
    if (e.key === "Enter" && digits.every((d) => d !== "")) fetchAttendance(digits.join(""), viewMonth, viewYear);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchAttendance(pin: string, month: number, year: number) {
    setPhase("loading");
    try {
      const res = await fetch("/api/my-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, month, year }),
      });
      const json = await res.json();
      if (!res.ok) { setErrorMsg(json.error ?? "Something went wrong."); setPhase("error"); return; }
      setData(json);
      setSavedPin(pin);
      setViewMonth(month);
      setViewYear(year);
      setPhase("view");
    } catch {
      setErrorMsg("Network error. Please check your connection."); setPhase("error");
    }
  }

  async function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setViewMonth(m); setViewYear(y);
    await fetchAttendance(savedPin, m, y);
  }

  const pinComplete = digits.every((d) => d !== "");

  // ── Success / view screen ─────────────────────────────────────────────────

  if (phase === "view" && data) {
    const totalDays = getDaysInMonth(data.month, data.year);
    const recordMap: Record<string, AttendanceRecord> = {};
    for (const r of data.records) recordMap[r.date] = r;

    const isCurrentMonth = viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
    const todayStr = today.toISOString().split("T")[0];

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f" }}>
        {/* Header */}
        <div className="px-4 pt-8 pb-4 flex flex-col items-center">
          <Image src="/Logo.png" alt="Yos Fitness Studio" width={160} height={40} className="h-10 w-auto object-contain mb-6" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">{data.employee.fullName}</h1>
            <p className="text-gray-400 text-sm mt-1">
              {ROLE_LABELS[data.employee.role] ?? data.employee.role} · {data.employee.employeeId}
            </p>
          </div>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => changeMonth(-1)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white transition-colors"
            style={{ background: "#1a1a1a" }}
          >
            ← Prev
          </button>
          <span className="text-white font-bold text-base">
            {MONTH_NAMES[data.month - 1]} {data.year}
          </span>
          <button
            onClick={() => changeMonth(1)}
            disabled={isCurrentMonth}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white transition-colors disabled:opacity-30"
            style={{ background: "#1a1a1a" }}
          >
            Next →
          </button>
        </div>

        {/* Summary pills */}
        <div className="px-4 pb-4 flex gap-2 flex-wrap">
          {[
            { key: "PRESENT", label: "Present", val: data.summary.PRESENT },
            { key: "ABSENT", label: "Absent", val: data.summary.ABSENT },
            { key: "HALF_DAY", label: "Half Day", val: data.summary.HALF_DAY },
            { key: "LEAVE", label: "Leave", val: data.summary.LEAVE + data.summary.PAID_LEAVE },
            { key: "WEEKLY_OFF", label: "Off", val: data.summary.WEEKLY_OFF },
          ].map(({ key, label, val }) => (
            <div
              key={key}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold flex-1 min-w-[100px] justify-center"
              style={{ background: STATUS_CONFIG[key]?.bg ?? "#1a1a1a", color: STATUS_CONFIG[key]?.color ?? "#fff" }}
            >
              <span className="text-xl font-bold">{val}</span>
              <span className="text-xs opacity-80">{label}</span>
            </div>
          ))}
        </div>

        {/* Day list */}
        <div className="px-4 pb-6 space-y-2 flex-1">
          {Array.from({ length: totalDays }, (_, i) => {
            const day = i + 1;
            const dateStr = `${data.year}-${String(data.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const rec = recordMap[dateStr];
            const dayName = getDayName(dateStr);
            const isSunday = dayName === "Sun";
            const isToday = dateStr === todayStr;
            const cfg = rec ? STATUS_CONFIG[rec.status] : null;

            return (
              <div
                key={dateStr}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{
                  background: isToday ? "#1e1e1e" : "#141414",
                  borderLeft: isToday ? "3px solid #dc2626" : "3px solid transparent",
                }}
              >
                {/* Date */}
                <div className="w-12 flex-shrink-0 text-center">
                  <p className={`text-lg font-bold leading-none ${isSunday ? "text-red-400" : "text-white"}`}>{day}</p>
                  <p className={`text-xs mt-0.5 ${isSunday ? "text-red-500" : "text-gray-500"}`}>{dayName}</p>
                </div>

                {/* Status badge */}
                <div className="flex-1">
                  {rec ? (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: cfg?.bg, color: cfg?.color }}
                    >
                      {cfg?.label ?? rec.status}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">
                      {isSunday ? "Sunday" : isCurrentMonth && day > today.getDate() ? "—" : "Not marked"}
                    </span>
                  )}
                </div>

                {/* Times */}
                {rec && (rec.checkInTime || rec.checkOutTime) && (
                  <div className="text-right flex-shrink-0">
                    {rec.checkInTime && (
                      <p className="text-xs text-gray-300">
                        <span className="text-gray-500">In</span> {formatTime(rec.checkInTime)}
                      </p>
                    )}
                    {rec.checkOutTime && (
                      <p className="text-xs text-gray-300">
                        <span className="text-gray-500">Out</span> {formatTime(rec.checkOutTime)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 pb-8 pt-2 space-y-3">
          <Link
            href="/checkin"
            className="block w-full py-4 rounded-xl font-semibold text-white text-base text-center"
            style={{ background: "#dc2626" }}
          >
            Mark Attendance
          </Link>
          <button
            onClick={() => { setPhase("input"); setDigits(["", "", "", ""]); setData(null); }}
            className="block w-full py-3 rounded-xl font-medium text-gray-400 text-sm text-center"
            style={{ background: "#1a1a1a" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ── Error screen ──────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0f0f0f" }}>
        <div className="text-7xl mb-6">❌</div>
        <h2 className="text-xl font-bold text-white mb-4">Oops!</h2>
        <p className="text-gray-300 text-base mb-10 text-center leading-relaxed">{errorMsg}</p>
        <button
          onClick={() => { setPhase("input"); setDigits(["", "", "", ""]); }}
          className="w-full max-w-xs py-4 rounded-xl font-semibold text-white"
          style={{ background: "#dc2626" }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── PIN entry screen ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0f0f0f" }}>
      <div className="w-full max-w-sm flex flex-col items-center">
        <Image src="/Logo.png" alt="Yos Fitness Studio" width={200} height={48} className="h-12 w-auto object-contain mb-8" priority />

        <h1 className="text-2xl font-bold text-white mb-2 text-center">My Attendance</h1>
        <p className="text-gray-400 text-base text-center mb-10">Enter your PIN to view your attendance</p>

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
              disabled={phase === "loading"}
              className="h-14 w-14 text-center text-2xl font-bold rounded-xl border-2 outline-none text-white transition-colors"
              style={{
                background: "#1a1a1a",
                borderColor: digit ? "#dc2626" : "#374151",
                caretColor: "#dc2626",
              }}
              onFocus={(e) => e.target.select()}
              autoFocus={i === 0}
            />
          ))}
        </div>

        <button
          onClick={() => fetchAttendance(digits.join(""), viewMonth, viewYear)}
          disabled={!pinComplete || phase === "loading"}
          className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-3 disabled:opacity-50"
          style={{ background: "#dc2626" }}
        >
          {phase === "loading" ? (
            <><Spinner /> Loading...</>
          ) : (
            "View My Attendance"
          )}
        </button>

        <Link href="/checkin" className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Back to Check-In
        </Link>
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
