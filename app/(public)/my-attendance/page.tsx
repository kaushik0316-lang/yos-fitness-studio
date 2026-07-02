"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect, KeyboardEvent, ChangeEvent } from "react";

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
  employee: {
    fullName: string; employeeId: string; role: string;
    shifts: { start: string; end: string }[] | null;
    shiftDays: number[] | null;
  };
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
  PRESENT:    { label: "Present",    color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  ABSENT:     { label: "Absent",     color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  HALF_DAY:   { label: "Half Day",   color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  WEEKLY_OFF: { label: "Week Off",   color: "#9ca3af", bg: "rgba(156,163,175,0.10)" },
  LEAVE:      { label: "Leave",      color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  PAID_LEAVE: { label: "Paid Leave", color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
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

function computeHoursPerDay(shifts: { start: string; end: string }[] | null): number {
  if (!Array.isArray(shifts)) return 0;
  let total = 0;
  for (const s of shifts) {
    if (!s.start || !s.end) continue;
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    if (mins > 0) total += mins / 60;
  }
  return total;
}

function computeHours(records: AttendanceRecord[], offDaySet: Set<string>, hoursPerDay: number, isTrainer: boolean) {
  let actual = 0;
  for (const r of records) {
    if (isTrainer && offDaySet.has(r.date)) continue;
    for (const s of r.shifts) {
      if (s.checkInTime && s.checkOutTime) {
        actual += (new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime()) / 3600000;
      }
    }
  }
  if (isTrainer && hoursPerDay > 0) actual += hoursPerDay * offDaySet.size;
  return Math.round(actual * 10) / 10;
}

function fmtHours(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
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

  useEffect(() => {
    const storedPin = sessionStorage.getItem("staff_pin");
    if (storedPin) fetch_(storedPin, today.getMonth() + 1, today.getFullYear());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const hasAnyRecord = data.records.length > 0;
    const isTrainer = data.employee.role === "TRAINER";

    // Hours progress computation
    const hoursPerDay = computeHoursPerDay(data.employee.shifts);
    const shiftDays: number[] = Array.isArray(data.employee.shiftDays) && (data.employee.shiftDays as number[]).length > 0
      ? (data.employee.shiftDays as number[])
      : [1, 2, 3, 4, 5, 6];
    const offDaySet = new Set<string>();
    for (let d = 1; d <= totalDays; d++) {
      if (!shiftDays.includes(new Date(data.year, data.month - 1, d).getDay())) {
        offDaySet.add(`${data.year}-${String(data.month).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
      }
    }
    const actualHours = computeHours(data.records, offDaySet, hoursPerDay, isTrainer);
    const requiredHours = isTrainer && hoursPerDay > 0 ? hoursPerDay * totalDays : 0;
    const hoursPct = requiredHours > 0 ? Math.min(100, (actualHours / requiredHours) * 100) : 0;
    const hoursColor = hoursPct >= 90 ? "#4ade80" : hoursPct >= 60 ? "#fb923c" : "#f87171";

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
        <div className="px-4 pt-8 pb-4 flex flex-col items-center">
          <Image src="/Logo.png" alt="Yos" width={120} height={120} className="h-10 w-auto object-contain mb-4" />
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-3"
            style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff" }}>
            {data.employee.fullName.trim().split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
          </div>
          <h1 className="text-xl font-bold text-white">{data.employee.fullName}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {ROLE_LABELS[data.employee.role] ?? data.employee.role} · {data.employee.employeeId}
          </p>
        </div>

        {/* Month nav — card style */}
        <div className="mx-4 mb-4 flex items-center justify-between px-3 py-2.5 rounded-2xl"
          style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => changeMonth(-1)}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
            ← Prev
          </button>
          <span className="text-white font-bold text-sm">{MONTH_NAMES[data.month - 1]} {data.year}</span>
          <button onClick={() => changeMonth(1)} disabled={isCurrentMonth}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
            Next →
          </button>
        </div>

        {/* Hours progress bar — trainers only */}
        {isTrainer && requiredHours > 0 && (
          <div className="mx-4 mb-3 p-4 rounded-2xl" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-0.5">Hours Logged</p>
                <p className="text-2xl font-extrabold" style={{ color: hoursColor, lineHeight: 1 }}>
                  {fmtHours(actualHours)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">{hoursPct.toFixed(0)}% of target</p>
                <p className="text-xs font-semibold text-gray-500">{fmtHours(requiredHours)} required</p>
              </div>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${hoursPct}%`, background: `linear-gradient(90deg, ${hoursColor}cc, ${hoursColor})` }} />
            </div>
            {requiredHours > actualHours && (
              <p className="text-[10px] text-gray-600 mt-1.5">{fmtHours(requiredHours - actualHours)} remaining this month</p>
            )}
          </div>
        )}

        {/* Unified 3×2 stat grid */}
        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
          {summaryItems.map(({ key, label, val }) => {
            const cfg = STATUS_CONFIG[key];
            return (
              <div key={key} className="flex flex-col items-center py-3 rounded-2xl"
                style={{ background: cfg.bg, border: `1px solid ${cfg.color}22` }}>
                <span className="text-2xl font-extrabold leading-none" style={{ color: cfg.color }}>{val}</span>
                <span className="text-[10px] mt-1.5 font-semibold text-center" style={{ color: cfg.color, opacity: 0.7 }}>{label}</span>
              </div>
            );
          })}
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
              const isOffDay = offDaySet.has(dateStr);
              const cfg = rec ? STATUS_CONFIG[rec.status] : null;
              const hasOpenShift = rec?.shifts.some((s) => !s.checkOutTime);

              const dayTotalMins = (rec?.shifts ?? []).reduce((sum, s) => {
                if (!s.checkOutTime) return sum;
                return sum + (new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime()) / 60000;
              }, 0);
              const dayHrsLabel = dayTotalMins >= 1
                ? (() => { const h = Math.floor(dayTotalMins / 60), m = Math.round(dayTotalMins % 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; })()
                : null;

              return (
                <div
                  key={dateStr}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "#141414",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderLeft: isToday ? "3px solid #f97316" : isOffDay ? "3px solid rgba(255,255,255,0.06)" : "3px solid transparent",
                  }}
                >
                  {/* Day header row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Date */}
                    <div className="w-9 flex-shrink-0 text-center">
                      <p className={`text-base font-extrabold leading-none ${isToday ? "text-orange-400" : isSunday ? "text-red-400" : "text-white"}`}>{day}</p>
                      <p className={`text-[10px] mt-0.5 font-medium ${isSunday ? "text-red-500/70" : "text-gray-600"}`}>{dayName}</p>
                    </div>

                    {/* Status + indicators */}
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      {isOffDay ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: "#4b5563" }}>
                          Off day
                        </span>
                      ) : rec ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: cfg?.bg, color: cfg?.color }}>
                          {cfg?.label ?? rec.status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-700">
                          {isFuture ? "—" : isSunday ? "Sunday" : "Not marked"}
                        </span>
                      )}
                      {hasOpenShift && (
                        <span className="flex items-center gap-1">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#fb923c" }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#fb923c" }} />
                          </span>
                          <span className="text-[10px] font-semibold" style={{ color: "#fb923c" }}>Still in</span>
                        </span>
                      )}
                    </div>

                    {/* Daily total hours */}
                    {dayHrsLabel && (
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "#4ade80" }}>
                        {dayHrsLabel}
                      </span>
                    )}
                  </div>

                  {/* Shifts — clean IN/OUT row */}
                  {rec && rec.shifts.length > 0 && (
                    <div className="mx-4 mb-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      {rec.shifts.map((s) => {
                        const isOpen = !s.checkOutTime;
                        const dur = duration(s.checkInTime, s.checkOutTime);
                        return (
                          <div key={s.shiftIndex} className="flex items-center gap-3 py-1">
                            {rec.shifts.length > 1 && (
                              <span className="text-[9px] text-gray-700 w-8 flex-shrink-0 font-bold uppercase">S{s.shiftIndex}</span>
                            )}
                            {/* IN */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold w-5" style={{ color: "#374151" }}>IN</span>
                              <span className="text-xs font-bold" style={{ color: "#4ade80" }}>{fmt(s.checkInTime)}</span>
                            </div>
                            {/* OUT */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold w-7" style={{ color: "#374151" }}>OUT</span>
                              {isOpen
                                ? <span className="text-xs font-semibold" style={{ color: "#fb923c" }}>Still in</span>
                                : <span className="text-xs font-bold" style={{ color: "#f87171" }}>{fmt(s.checkOutTime)}</span>
                              }
                            </div>
                            {/* Duration */}
                            {dur && (
                              <span className="text-[10px] ml-auto" style={{ color: "#6b7280" }}>{dur}</span>
                            )}
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
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 space-y-2"
          style={{ background: "linear-gradient(to top, #0f0f0f 80%, transparent)" }}>
          <Link
            href="/checkin"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Mark Attendance
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-2xl font-medium text-sm text-center transition-colors"
            style={{ background: "#1a1a1a", color: signOutConfirm ? "#f87171" : "#6b7280", border: "1px solid rgba(255,255,255,0.05)" }}
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
        <button onClick={() => { setPhase("input"); setDigits(["","","",""]); }}
          className="w-full max-w-xs py-4 rounded-2xl font-bold text-white"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
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
              style={{ background: "#1a1a1a", borderColor: digit ? "#f97316" : "#374151", caretColor: "#f97316" }}
            />
          ))}
        </div>

        <button
          onClick={() => fetch_(digits.join(""), viewMonth, viewYear)}
          disabled={!pinComplete || phase === "loading"}
          className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
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
