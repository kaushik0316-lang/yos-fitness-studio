"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, KeyboardEvent, ChangeEvent } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = "input" | "loading" | "view" | "error";

type Shift = {
  shiftIndex: number;
  checkInTime: string;
  checkOutTime: string | null;
};

type AttendanceRecord = {
  date: string;
  status: string;
  shifts: Shift[];
};

type Summary = {
  PRESENT: number; ABSENT: number; HALF_DAY: number;
  WEEKLY_OFF: number; LEAVE: number; PAID_LEAVE: number;
};

type EmployeeData = {
  employee: { fullName: string; employeeId: string; role: string };
  month: number; year: number;
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
  WEEKLY_OFF: { label: "Week Off",   color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  LEAVE:      { label: "Leave",      color: "#2563eb", bg: "rgba(37,99,235,0.15)" },
  PAID_LEAVE: { label: "Paid Leave", color: "#7c3aed", bg: "rgba(124,58,237,0.15)" },
};

const ROLE_LABELS: Record<string, string> = {
  FRONT_DESK: "Front Desk", TRAINER: "Trainer",
  CLEANER: "Cleaner", MANAGER: "Manager", ADMIN: "Admin",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function duration(inISO: string, outISO: string | null): string {
  if (!outISO) return "";
  const diff = (new Date(outISO).getTime() - new Date(inISO).getTime()) / 60000;
  const h = Math.floor(diff / 60);
  const m = Math.round(diff % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getDaysInMonth(month: number, year: number) { return new Date(year, month, 0).getDate(); }
function getDayName(dateStr: string) { return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(dateStr).getDay()]; }

function totalMonthHours(records: AttendanceRecord[]): string {
  let mins = 0;
  for (const r of records) {
    for (const s of r.shifts) {
      if (s.checkOutTime) {
        mins += (new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime()) / 60000;
      }
    }
  }
  if (mins < 1) return "";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MyAttendancePage() {
  const today = new Date();
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [phase, setPhase] = useState<Phase>("input");
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState<EmployeeData | null>(null);
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [savedPin, setSavedPin]   = useState("");
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[index] = val; setDigits(next);
    if (val && index < 3) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) { const n = [...digits]; n[index] = ""; setDigits(n); }
      else if (index > 0) { inputs.current[index - 1]?.focus(); const n = [...digits]; n[index - 1] = ""; setDigits(n); }
    }
    if (e.key === "Enter" && digits.every((d) => d)) fetch_(digits.join(""), viewMonth, viewYear);
  }

  async function fetch_(pin: string, month: number, year: number) {
    setPhase("loading");
    try {
      const res = await fetch("/api/my-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, month, year }),
      });
      const json = await res.json();
      if (!res.ok) { setErrorMsg(json.error ?? "Something went wrong."); setPhase("error"); return; }
      setData(json); setSavedPin(pin); setViewMonth(month); setViewYear(year); setPhase("view");
    } catch { setErrorMsg("Network error."); setPhase("error"); }
  }

  async function changeMonth(delta: number) {
    let m = viewMonth + delta, y = viewYear;
    if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    await fetch_(savedPin, m, y);
  }

  function handleSignOut() {
    if (!signOutConfirm) {
      setSignOutConfirm(true);
      setTimeout(() => setSignOutConfirm(false), 3000);
      return;
    }
    setPhase("input"); setDigits(["","","",""]); setData(null); setSignOutConfirm(false);
  }

  const pinComplete = digits.every((d) => d !== "");

  // ── View screen ────────────────────────────────────────────────────────────

  if (phase === "view" && data) {
    const totalDays = getDaysInMonth(data.month, data.year);
    const recordMap: Record<string, AttendanceRecord> = {};
    for (const r of data.records) recordMap[r.date] = r;
    const isCurrentMonth = viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
    const todayStr = today.toISOString().split("T")[0];
    const monthTotal = totalMonthHours(data.records);
    const hasAnyRecord = data.records.length > 0;

    const summaryItems = [
      { key: "PRESENT",    label: "Present",    val: data.summary.PRESENT },
      { key: "ABSENT",     label: "Absent",     val: data.summary.ABSENT },
      { key: "HALF_DAY",   label: "Half Day",   val: data.summary.HALF_DAY },
      { key: "LEAVE",      label: "Leave",      val: data.summary.LEAVE },
      { key: "PAID_LEAVE", label: "Paid Leave", val: data.summary.PAID_LEAVE },
      { key: "WEEKLY_OFF", label: "Week Off",   val: data.summary.WEEKLY_OFF },
    ];

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f" }}>

        {/* Header */}
        <div className="px-4 pt-8 pb-2 flex flex-col items-center">
          <Image src="/Logo.png" alt="Yos" width={120} height={120} className="h-12 w-auto object-contain mb-5" />
          <h1 className="text-xl font-bold text-white">{data.employee.fullName}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {ROLE_LABELS[data.employee.role] ?? data.employee.role} · {data.employee.employeeId}
          </p>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={() => changeMonth(-1)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white" style={{ background: "#1a1a1a" }}>
            ← Prev
          </button>
          <span className="text-white font-bold">{MONTH_NAMES[data.month - 1]} {data.year}</span>
          <button
            onClick={() => changeMonth(1)}
            disabled={isCurrentMonth}
            title={isCurrentMonth ? "This is the current month" : "Next month"}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "#1a1a1a" }}
          >
            Next →
          </button>
        </div>

        {/* Featured: Total Hours + Days Present */}
        <div className="px-4 pb-3 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center py-4 rounded-2xl" style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.25)" }}>
            <span className="text-3xl font-extrabold leading-none" style={{ color: "#16a34a" }}>
              {monthTotal || "0h"}
            </span>
            <span className="text-xs mt-1.5 font-semibold" style={{ color: "#16a34a", opacity: 0.75 }}>Total Hours</span>
          </div>
          <div className="flex flex-col items-center py-4 rounded-2xl" style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.15)" }}>
            <span className="text-3xl font-extrabold leading-none text-white">{data.summary.PRESENT}</span>
            <span className="text-xs mt-1.5 font-semibold text-gray-500">Days Present</span>
          </div>
        </div>

        {/* Secondary summary — 3 cols */}
        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
          {summaryItems.filter(({ key }) => !["PRESENT"].includes(key)).map(({ key, label, val }) => (
            <div key={key} className="flex flex-col items-center py-2.5 rounded-xl" style={{ background: STATUS_CONFIG[key]?.bg, color: STATUS_CONFIG[key]?.color }}>
              <span className="text-xl font-bold leading-none">{val}</span>
              <span className="text-[10px] mt-1 opacity-80 text-center">{label}</span>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {!hasAnyRecord ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-white font-semibold text-base mb-1">No attendance recorded</p>
            <p className="text-gray-500 text-sm">No entries found for {MONTH_NAMES[data.month - 1]} {data.year}.</p>
          </div>
        ) : (
          /* Day list */
          <div className="px-3 pb-36 space-y-2 flex-1">
            {Array.from({ length: totalDays }, (_, i) => {
              const day = i + 1;
              const dateStr = `${data.year}-${String(data.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const rec = recordMap[dateStr];
              const dayName = getDayName(dateStr);
              const isSunday = dayName === "Sun";
              const isToday = dateStr === todayStr;
              const isFuture = isCurrentMonth && day > today.getDate();
              const cfg = rec ? STATUS_CONFIG[rec.status] : null;
              const hasOpenShift = rec?.shifts.some((s) => !s.checkOutTime);

              return (
                <div
                  key={dateStr}
                  className="rounded-xl overflow-hidden"
                  style={{ background: "#141414", borderLeft: isToday ? "3px solid #dc2626" : "3px solid transparent" }}
                >
                  {/* Day header row */}
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-10 flex-shrink-0 text-center">
                      <p className={`text-base font-bold leading-none ${isSunday || isToday ? "text-red-400" : "text-white"}`}>{day}</p>
                      <p className={`text-[10px] mt-0.5 ${isSunday ? "text-red-500" : "text-gray-500"}`}>{dayName}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      {rec ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md" style={{ background: cfg?.bg, color: cfg?.color }}>
                          {cfg?.label ?? rec.status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">
                          {isFuture ? "—" : isSunday ? "Sunday" : "Not marked"}
                        </span>
                      )}
                      {/* Still-in pulse */}
                      {hasOpenShift && (
                        <span className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#d97706" }} />
                            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#d97706" }} />
                          </span>
                          <span className="text-[10px] font-semibold" style={{ color: "#d97706" }}>Still in</span>
                        </span>
                      )}
                    </div>
                    {/* Total hours for the day — prominent */}
                    {rec && rec.shifts.length > 0 && (() => {
                      const total = rec.shifts.reduce((sum, s) => {
                        if (!s.checkOutTime) return sum;
                        return sum + (new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime());
                      }, 0) / 60000;
                      if (total < 1) return null;
                      const h = Math.floor(total / 60), m = Math.round(total % 60);
                      return (
                        <span className="text-sm font-bold flex-shrink-0" style={{ color: "#16a34a" }}>
                          {h > 0 ? `${h}h ${m}m` : `${m}m`}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Shifts */}
                  {rec && rec.shifts.length > 0 && (
                    <div className="border-t mx-3 mb-2" style={{ borderColor: "#1f1f1f" }}>
                      {rec.shifts.map((s) => {
                        const isOpen = !s.checkOutTime;
                        return (
                          <div key={s.shiftIndex} className="flex items-center gap-3 px-1 py-2">
                            {rec.shifts.length > 1 && (
                              <span className="text-[10px] text-gray-600 w-12 flex-shrink-0 font-medium">Shift {s.shiftIndex}</span>
                            )}
                            <div className="flex items-center gap-2 flex-1 flex-wrap">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(22,163,74,0.15)", color: "#16a34a" }}>
                                IN {fmt(s.checkInTime)}
                              </span>
                              {isOpen ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(217,119,6,0.15)", color: "#d97706" }}>
                                  Still in
                                </span>
                              ) : (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(220,38,38,0.15)", color: "#dc2626" }}>
                                  OUT {fmt(s.checkOutTime)}
                                </span>
                              )}
                              {s.checkOutTime && (
                                <span className="text-[10px] text-gray-500">({duration(s.checkInTime, s.checkOutTime)})</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 space-y-2" style={{ background: "linear-gradient(to top, #0f0f0f 75%, transparent)" }}>
          <Link
            href="/checkin"
            className="block w-full py-3.5 rounded-xl font-semibold text-white text-base text-center"
            style={{ background: "#dc2626" }}
          >
            Mark Attendance
          </Link>
          <button
            onClick={handleSignOut}
            className="block w-full py-3 rounded-xl font-medium text-sm text-center transition-colors"
            style={{ background: "#1a1a1a", color: signOutConfirm ? "#dc2626" : "#6b7280" }}
          >
            {signOutConfirm ? "Tap again to confirm sign out" : "Sign Out"}
          </button>
        </div>
      </div>
    );
  }

  // ── Error screen ───────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0f0f0f" }}>
        <div className="text-7xl mb-6">❌</div>
        <h2 className="text-xl font-bold text-white mb-4">Oops!</h2>
        <p className="text-gray-300 text-base mb-10 text-center">{errorMsg}</p>
        <button onClick={() => { setPhase("input"); setDigits(["","","",""]); }} className="w-full max-w-xs py-4 rounded-xl font-semibold text-white" style={{ background: "#dc2626" }}>
          Try Again
        </button>
      </div>
    );
  }

  // ── PIN entry screen ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0f0f0f" }}>
      <div className="w-full max-w-sm flex flex-col items-center">
        <Image src="/Logo.png" alt="Yos" width={120} height={120} className="h-12 w-auto object-contain mb-8" priority />
        <h1 className="text-2xl font-bold text-white mb-2 text-center">My Attendance</h1>
        <p className="text-gray-400 text-base text-center mb-10">Enter your 4-digit PIN to view your attendance</p>

        <div className="flex gap-4 mb-10">
          {digits.map((digit, i) => (
            <input
              key={i} ref={(el) => { inputs.current[i] = el; }}
              type="tel" inputMode="numeric" maxLength={1} value={digit}
              onChange={(e) => handleChange(i, e)} onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={phase === "loading"} autoFocus={i === 0}
              onFocus={(e) => e.target.select()}
              className="h-14 w-14 text-center text-2xl font-bold rounded-xl border-2 outline-none text-white transition-colors"
              style={{ background: "#1a1a1a", borderColor: digit ? "#dc2626" : "#374151", caretColor: "#dc2626" }}
            />
          ))}
        </div>

        <button
          onClick={() => fetch_(digits.join(""), viewMonth, viewYear)}
          disabled={!pinComplete || phase === "loading"}
          className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-3 disabled:opacity-50"
          style={{ background: "#dc2626" }}
        >
          {phase === "loading" ? <><Spinner /> Loading...</> : "View My Attendance"}
        </button>

        <Link href="/checkin" className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Back to Staff Dashboard
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
