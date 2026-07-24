"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from "react";

type Phase = "input" | "loading" | "view" | "error";

type AttendanceRecord = {
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  autoCheckedOut: boolean;
  session2CheckInTime: string | null;
  session2CheckOutTime: string | null;
  session2AutoCheckedOut: boolean;
};

type MemberData = {
  member: { memberId: string; fullName: string; status: string; expiryDate: string | null; packageName: string | null };
  month: number; year: number;
  daysAttended: number;
  streak: number;
  lastVisitDate: string | null;
  records: AttendanceRecord[];
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DOW_LABELS = ["S","M","T","W","T","F","S"];
const MONTHLY_GOAL = 20;

function getDaysInMonth(month: number, year: number) { return new Date(year, month, 0).getDate(); }

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/** Duration in minutes between two ISO timestamps, or null if either is missing */
function durationMins(inIso: string, outIso: string | null): number | null {
  if (!outIso) return null;
  return Math.round((new Date(outIso).getTime() - new Date(inIso).getTime()) / 60000);
}

/** Total gym time for a record (session1 + session2), null if no checkout at all */
function totalMins(r: AttendanceRecord): number | null {
  const s1 = durationMins(r.checkInTime, r.checkOutTime);
  const s2 = r.session2CheckInTime ? durationMins(r.session2CheckInTime, r.session2CheckOutTime) : null;
  if (s1 === null && s2 === null) return null;
  return (s1 ?? 0) + (s2 ?? 0);
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getMotivation(rate: number, streak: number): { msg: string; emoji: string; color: string } {
  if (streak >= 7)  return { msg: `${streak} days straight! Absolutely unstoppable!`, emoji: "🏆", color: "#f59e0b" };
  if (streak >= 5)  return { msg: `${streak} days in a row! You're on fire!`,          emoji: "🔥", color: "#f97316" };
  if (rate >= 80)   return { msg: "You're crushing it this month!",                     emoji: "💪", color: "#22c55e" };
  if (rate >= 60)   return { msg: "Great work! Keep the momentum going.",               emoji: "🔥", color: "#22c55e" };
  if (rate >= 40)   return { msg: "Good progress. Push a little harder!",               emoji: "⚡", color: "#f97316" };
  if (rate >= 20)   return { msg: "Time to pick up the pace!",                          emoji: "🎯", color: "#f97316" };
  return              { msg: "Let's get back on track. You got this!",                  emoji: "💡", color: "#6b7280" };
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function MyMembershipPage() {
  const today = new Date();
  const [digits, setDigits]    = useState<string[]>(["","","",""]);
  const [phase, setPhase]      = useState<Phase>("input");
  const [errorMsg, setError]   = useState("");
  const [data, setData]        = useState<MemberData | null>(null);
  const [viewMonth, setVMonth] = useState(today.getMonth() + 1);
  const [viewYear, setVYear]   = useState(today.getFullYear());
  const [savedPin, setSaved]   = useState("");
  const [signOutConfirm, setSOC] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("member_pin");
    if (stored) fetch_(stored, today.getMonth() + 1, today.getFullYear());
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
      const res = await fetch("/api/my-membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, month, year }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Something went wrong."); setPhase("error"); return; }
      setData(json); setSaved(pin); setVMonth(month); setVYear(year); setPhase("view");
      sessionStorage.setItem("member_pin", pin);
    } catch { setError("Network error."); setPhase("error"); }
  }

  async function changeMonth(delta: number) {
    let m = viewMonth + delta, y = viewYear;
    if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    await fetch_(savedPin, m, y);
  }

  function handleSignOut() {
    if (!signOutConfirm) { setSOC(true); setTimeout(() => setSOC(false), 3000); return; }
    sessionStorage.removeItem("member_pin");
    setPhase("input"); setDigits(["","","",""]); setData(null); setSOC(false);
  }

  const pinComplete = digits.every((d) => d !== "");

  // ── VIEW ────────────────────────────────────────────────────────────────────
  if (phase === "view" && data) {
    const totalDays    = getDaysInMonth(data.month, data.year);
    const attendedSet  = new Set(data.records.map((r) => r.date));
    const recordMap: Record<string, AttendanceRecord> = {};
    for (const r of data.records) recordMap[r.date] = r;

    const isCurrentMonth = viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
    const todayStr = today.toISOString().split("T")[0];

    // Attendance rate vs days elapsed so far
    const daysElapsed  = isCurrentMonth ? today.getDate() : totalDays;
    const rate         = daysElapsed > 0 ? Math.round((data.daysAttended / daysElapsed) * 100) : 0;
    const goalPct      = Math.min(100, Math.round((data.daysAttended / MONTHLY_GOAL) * 100));

    // Day-of-week attendance counts
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const r of data.records) {
      dowCounts[new Date(r.date + "T00:00:00").getDay()]++;
    }
    const maxDow = Math.max(...dowCounts, 1);

    // Calendar: first day of month offset
    const firstDow = new Date(data.year, data.month - 1, 1).getDay();

    // Expiry countdown
    const expiryDays = data.member.expiryDate
      ? Math.ceil((new Date(data.member.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Days since last visit
    const daysSinceLast = data.lastVisitDate
      ? Math.floor((today.getTime() - new Date(data.lastVisitDate + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const streak = data.streak ?? 0;
    const { msg: motivMsg, emoji: motivEmoji, color: motivColor } = getMotivation(rate, streak);

    // Time spent calculations
    const durations = data.records.map(totalMins).filter((d): d is number => d !== null && d > 0);
    const avgMins   = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

    const rateColor = rate >= 60 ? "#22c55e" : rate >= 30 ? "#f97316" : "#ef4444";
    const rateBg    = rate >= 60 ? "rgba(34,197,94,0.1)"  : rate >= 30 ? "rgba(249,115,22,0.1)"  : "rgba(239,68,68,0.1)";
    const rateBdr   = rate >= 60 ? "rgba(34,197,94,0.2)"  : rate >= 30 ? "rgba(249,115,22,0.2)"  : "rgba(239,68,68,0.2)";

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f" }}>

        {/* ── Header ── */}
        <div className="px-4 pt-8 pb-4 flex flex-col items-center">
          <Image src="/Logo.png" alt="Yos" width={120} height={120} className="h-10 w-auto object-contain mb-4" />
          <h1 className="text-xl font-bold text-white tracking-tight">{data.member.fullName}</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {data.member.memberId}
            {data.member.packageName ? ` · ${data.member.packageName}` : ""}
          </p>

          {/* Expiry countdown pill */}
          {expiryDays !== null && (
            <div className="mt-2.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: expiryDays < 0  ? "rgba(239,68,68,0.15)"
                          : expiryDays < 10 ? "rgba(239,68,68,0.15)"
                          : expiryDays < 30 ? "rgba(249,115,22,0.15)"
                          : "rgba(34,197,94,0.12)",
                color:      expiryDays < 0  ? "#ef4444"
                          : expiryDays < 10 ? "#ef4444"
                          : expiryDays < 30 ? "#f97316"
                          : "#22c55e",
                border: `1px solid ${
                  expiryDays < 0  ? "rgba(239,68,68,0.35)"
                : expiryDays < 10 ? "rgba(239,68,68,0.35)"
                : expiryDays < 30 ? "rgba(249,115,22,0.3)"
                : "rgba(34,197,94,0.25)"}`,
              }}>
              {expiryDays < 0  ? "✗ Membership Expired"
             : expiryDays === 0 ? "⚠ Expires today — renew now!"
             : expiryDays < 30 ? `⚠ Expires in ${expiryDays} day${expiryDays === 1 ? "" : "s"} — renew soon`
             : `✓ Active · ${expiryDays} days remaining`}
            </div>
          )}
        </div>

        {/* ── Month nav ── */}
        <div className="flex items-center justify-between px-4 py-2">
          <button onClick={() => changeMonth(-1)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white transition-colors"
            style={{ background: "#1a1a1a" }}>
            ← Prev
          </button>
          <span className="text-white font-bold">{MONTH_NAMES[data.month - 1]} {data.year}</span>
          <button onClick={() => changeMonth(1)} disabled={isCurrentMonth}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ background: "#1a1a1a" }}>
            Next →
          </button>
        </div>

        {/* ── Stats grid: Attended | Streak | Rate | Avg Time ── */}
        <div className="px-4 pt-2 pb-3 grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center py-4 rounded-2xl"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <span className="text-2xl font-extrabold leading-none" style={{ color: "#22c55e" }}>
              {data.daysAttended}
            </span>
            <span className="text-[10px] mt-1.5 font-semibold text-gray-500">Days Attended</span>
          </div>

          <div className="flex flex-col items-center py-4 rounded-2xl"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
            {streak > 0 ? (
              <span className="text-2xl font-extrabold leading-none" style={{ color: "#f59e0b" }}>🔥{streak}</span>
            ) : (
              <span className="text-sm font-bold leading-none text-center px-1" style={{ color: "#78716c" }}>Start{"\n"}today!</span>
            )}
            <span className="text-[10px] mt-1.5 font-semibold text-gray-500">Day Streak</span>
          </div>

          <div className="flex flex-col items-center py-4 rounded-2xl"
            style={{ background: rateBg, border: `1px solid ${rateBdr}` }}>
            <span className="text-2xl font-extrabold leading-none" style={{ color: rateColor }}>
              {rate}%
            </span>
            <span className="text-[10px] mt-1.5 font-semibold text-gray-500">Attendance Rate</span>
          </div>

          <div className="flex flex-col items-center py-4 rounded-2xl"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <span className="text-2xl font-extrabold leading-none" style={{ color: "#a78bfa" }}>
              {avgMins !== null ? fmtDuration(avgMins) : "—"}
            </span>
            <span className="text-[10px] mt-1.5 font-semibold text-gray-500">Avg Time/Day</span>
          </div>
        </div>

        {/* ── Motivational banner ── */}
        <div className="mx-4 mb-3 px-4 py-3 rounded-xl flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-xl flex-shrink-0">{motivEmoji}</span>
          <p className="text-sm font-semibold leading-tight" style={{ color: motivColor }}>{motivMsg}</p>
        </div>

        {/* ── Monthly goal bar ── */}
        <div className="mx-4 mb-3 px-4 py-3 rounded-xl" style={{ background: "#141414", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400">Monthly Goal</span>
            <span className="text-xs font-bold" style={{ color: data.daysAttended >= MONTHLY_GOAL ? "#22c55e" : "#6b7280" }}>
              {data.daysAttended} / {MONTHLY_GOAL} days
              {data.daysAttended >= MONTHLY_GOAL && " 🎉"}
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#252525" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${goalPct}%`,
                background: goalPct >= 100
                  ? "linear-gradient(90deg, #22c55e, #16a34a)"
                  : goalPct >= 50
                  ? "linear-gradient(90deg, #f97316, #ea580c)"
                  : "linear-gradient(90deg, #6b7280, #4b5563)",
              }} />
          </div>
          {!isCurrentMonth && (
            <p className="text-[10px] text-gray-600 mt-1.5">
              {data.daysAttended >= MONTHLY_GOAL
                ? "Goal achieved this month!"
                : `Missed by ${MONTHLY_GOAL - data.daysAttended} day${MONTHLY_GOAL - data.daysAttended === 1 ? "" : "s"}`}
            </p>
          )}
          {isCurrentMonth && data.daysAttended < MONTHLY_GOAL && (
            <p className="text-[10px] text-gray-600 mt-1.5">
              {MONTHLY_GOAL - data.daysAttended} more day{MONTHLY_GOAL - data.daysAttended === 1 ? "" : "s"} to hit your goal
            </p>
          )}
        </div>

        {/* ── Weekly pattern — SVG bar chart ── */}
        <div className="mx-4 mb-3 px-4 py-3 rounded-xl" style={{ background: "#141414", border: "1px solid #1e1e1e" }}>
          <p className="text-xs font-bold text-gray-400 mb-1">Your Weekly Pattern</p>
          <svg viewBox="0 0 280 72" style={{ width: "100%", height: "80px", overflow: "visible" }}>
            <defs>
              <linearGradient id="dowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
              <linearGradient id="dowGradDim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {DOW_LABELS.map((label, i) => {
              const count  = dowCounts[i];
              const barH   = count > 0 ? Math.max(6, Math.round((count / maxDow) * 42)) : 4;
              const isSun  = i === 0;
              const slotW  = 280 / 7;
              const barW   = 22;
              const x      = i * slotW + slotW / 2 - barW / 2;
              const y      = 50 - barH;
              return (
                <g key={i}>
                  {/* bar background track */}
                  <rect x={x} y={50 - 42} width={barW} height={42} rx={4} fill="#1e1e1e" />
                  {/* filled bar */}
                  <rect x={x} y={y} width={barW} height={barH} rx={4}
                    fill={count > 0 ? (isSun ? "url(#dowGradDim)" : "url(#dowGrad)") : "#1e1e1e"} />
                  {/* count label above bar */}
                  {count > 0 && (
                    <text x={x + barW / 2} y={y - 3} textAnchor="middle"
                      fontSize="8" fontWeight="700" fill={isSun ? "#4ade80" : "#22c55e"}>
                      {count}
                    </text>
                  )}
                  {/* day label */}
                  <text x={x + barW / 2} y={64} textAnchor="middle"
                    fontSize="9" fontWeight="700" fill={isSun ? "#4b5563" : count > 0 ? "#9ca3af" : "#374151"}>
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Last visit nudge ── */}
        {isCurrentMonth && daysSinceLast !== null && daysSinceLast >= 3 && (
          <div className="mx-4 mb-3 px-4 py-3 rounded-xl flex items-center gap-3"
            style={{
              background: "rgba(249,115,22,0.07)",
              border: "1px solid rgba(249,115,22,0.2)",
            }}>
            <span className="text-lg flex-shrink-0">📅</span>
            <p className="text-xs font-semibold leading-snug" style={{ color: "#f97316" }}>
              {daysSinceLast >= 14
                ? `${daysSinceLast} days since your last visit. Let's get back!`
                : daysSinceLast >= 7
                ? `${daysSinceLast} days since your last visit. Your body misses the gym!`
                : `${daysSinceLast} days since your last visit. Come back soon!`}
            </p>
          </div>
        )}

        {/* ── Calendar dot grid ── */}
        <div className="mx-4 mb-3 px-4 py-4 rounded-xl" style={{ background: "#141414", border: "1px solid #1e1e1e" }}>
          <p className="text-xs font-bold text-gray-400 mb-3">
            {MONTH_NAMES[data.month - 1]} {data.year} Calendar
          </p>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1.5">
            {DOW_LABELS.map((l, i) => (
              <div key={i} className="text-center text-[9px] font-bold" style={{ color: i === 0 ? "#4b5563" : "#4b5563" }}>
                {l}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {/* Empty offset cells */}
            {Array.from({ length: firstDow }, (_, i) => (
              <div key={`e${i}`} />
            ))}

            {Array.from({ length: totalDays }, (_, i) => {
              const day  = i + 1;
              const ds   = `${data.year}-${String(data.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const attended = attendedSet.has(ds);
              const isToday  = ds === todayStr;
              const isFuture = isCurrentMonth && day > today.getDate();
              const isSun    = new Date(ds + "T00:00:00").getDay() === 0;

              return (
                <div key={ds} className="flex justify-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center select-none"
                    style={{
                      background: attended
                        ? "linear-gradient(135deg, #22c55e, #16a34a)"
                        : isToday
                        ? "transparent"
                        : "transparent",
                      border: attended
                        ? "none"
                        : isToday
                        ? "2px solid #22c55e"
                        : "none",
                      boxShadow: attended ? "0 2px 8px rgba(34,197,94,0.35)" : "none",
                    }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: attended ? 800 : isToday ? 700 : 500,
                        color: attended
                          ? "#0a0a0a"
                          : isToday
                          ? "#22c55e"
                          : isFuture
                          ? "#252525"
                          : isSun
                          ? "#374151"
                          : "#3a3a3a",
                      }}>
                      {day}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-2.5" style={{ borderTop: "1px solid #1e1e1e" }}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }} />
              <span className="text-[9px] font-semibold text-gray-500">Attended</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ border: "1.5px solid #22c55e" }} />
              <span className="text-[9px] font-semibold text-gray-500">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "#1e1e1e" }} />
              <span className="text-[9px] font-semibold text-gray-500">Missed</span>
            </div>
          </div>
        </div>

        {/* ── Time Per Visit bar chart ── */}
        {durations.length > 0 && (() => {
          const chartRecords = data.records.filter((r) => totalMins(r) !== null && totalMins(r)! > 0);
          const maxM  = Math.max(...chartRecords.map((r) => totalMins(r)!));
          const BAR_W = 28;
          const GAP   = 8;
          const CHART_H = 80;
          const svgW  = chartRecords.length * (BAR_W + GAP) + 8;
          return (
            <div className="mx-4 mb-3 rounded-xl overflow-hidden" style={{ background: "#141414", border: "1px solid #1e1e1e" }}>
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400">Time Per Visit</p>
                {avgMins !== null && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                    avg {fmtDuration(avgMins)}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto pb-3 px-2" style={{ WebkitOverflowScrolling: "touch" }}>
                <svg width={svgW} height={CHART_H} style={{ display: "block", minWidth: "100%" }}>
                  <defs>
                    <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                    {avgMins !== null && (
                      <line id="avgLine" />
                    )}
                  </defs>

                  {/* Avg time dashed guide line */}
                  {avgMins !== null && (() => {
                    const avgY = CHART_H - 18 - Math.round((avgMins / maxM) * 52);
                    return (
                      <line x1={0} y1={avgY} x2={svgW} y2={avgY}
                        stroke="#a78bfa" strokeWidth="1" strokeDasharray="3 3" opacity={0.4} />
                    );
                  })()}

                  {chartRecords.map((r, i) => {
                    const mins  = totalMins(r)!;
                    const barH  = Math.max(6, Math.round((mins / maxM) * 52));
                    const x     = 4 + i * (BAR_W + GAP);
                    const y     = CHART_H - 18 - barH;
                    const day   = parseInt(r.date.split("-")[2]);
                    const hasS2 = !!r.session2CheckInTime;
                    return (
                      <g key={r.date}>
                        {/* Bar */}
                        <rect x={x} y={y} width={BAR_W} height={barH} rx={5}
                          fill="url(#timeGrad)" opacity={0.9} />
                        {/* S2 indicator dot */}
                        {hasS2 && (
                          <circle cx={x + BAR_W - 4} cy={y + 5} r={3} fill="#22c55e" />
                        )}
                        {/* Duration label above bar */}
                        <text x={x + BAR_W / 2} y={y - 3} textAnchor="middle"
                          fontSize="7" fontWeight="800" fill="#c4b5fd">
                          {fmtDuration(mins)}
                        </text>
                        {/* Day number below */}
                        <text x={x + BAR_W / 2} y={CHART_H - 4} textAnchor="middle"
                          fontSize="8" fontWeight="600" fill="#4b5563">
                          {day}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="px-4 pb-3 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "linear-gradient(#a78bfa,#7c3aed)" }} />
                  <span className="text-[9px] font-semibold text-gray-500">Time spent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-0.5 rounded-full" style={{ background: "#a78bfa", opacity: 0.5 }} />
                  <span className="text-[9px] font-semibold text-gray-500">Avg ({avgMins !== null ? fmtDuration(avgMins) : "—"})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
                  <span className="text-[9px] font-semibold text-gray-500">2 sessions</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Compact visit log (attended days only) ── */}
        {data.records.length > 0 && (
          <div className="mx-4 mb-3 px-4 py-3 rounded-xl" style={{ background: "#141414", border: "1px solid #1e1e1e" }}>
            <p className="text-xs font-bold text-gray-400 mb-2">Visit Log</p>
            <div className="space-y-1.5">
              {[...data.records].reverse().map((r) => {
                const d = new Date(r.date + "T00:00:00");
                const dayLabel = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });
                const mins = totalMins(r);
                const hasS2 = !!r.session2CheckInTime;
                return (
                  <div key={r.date} className="py-2" style={{ borderBottom: "1px solid #1e1e1e" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-200">{dayLabel}</span>
                      {mins !== null && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                          style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                          ⏱ {fmtDuration(mins)}{hasS2 ? " (2 sessions)" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                        style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                        In {fmt(r.checkInTime)}
                        {r.checkOutTime ? ` · Out ${fmt(r.checkOutTime)}` : " · —"}
                        {r.autoCheckedOut && <span style={{ color: "#6b7280" }}> (auto)</span>}
                      </span>
                      {hasS2 && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                          style={{ background: "rgba(34,197,94,0.07)", color: "#4ade80" }}>
                          S2 In {fmt(r.session2CheckInTime!)}
                          {r.session2CheckOutTime ? ` · Out ${fmt(r.session2CheckOutTime)}` : " · —"}
                          {r.session2AutoCheckedOut && <span style={{ color: "#6b7280" }}> (auto)</span>}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Spacer for fixed footer */}
        <div className="pb-36" />

        {/* ── Sticky footer ── */}
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 space-y-2"
          style={{ background: "linear-gradient(to top, #0f0f0f 80%, transparent)" }}>
          <Link href="/member-checkin"
            className="block w-full py-3.5 rounded-xl font-bold text-white text-base text-center"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 16px rgba(34,197,94,0.3)" }}>
            Check In Today
          </Link>
          <button onClick={handleSignOut}
            className="block w-full py-3 rounded-xl font-medium text-sm text-center transition-colors"
            style={{ background: "#1a1a1a", color: signOutConfirm ? "#dc2626" : "#6b7280" }}>
            {signOutConfirm ? "Tap again to confirm sign out" : "Sign Out"}
          </button>
        </div>
      </div>
    );
  }

  // ── ERROR ───────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0f0f0f" }}>
        <div className="text-7xl mb-6">❌</div>
        <h2 className="text-xl font-bold text-white mb-4">Oops!</h2>
        <p className="text-gray-300 text-base mb-10 text-center">{errorMsg}</p>
        <button onClick={() => { setPhase("input"); setDigits(["","","",""]); }}
          className="w-full max-w-xs py-4 rounded-xl font-semibold text-white"
          style={{ background: "#22c55e" }}>
          Try Again
        </button>
      </div>
    );
  }

  // ── PIN ENTRY ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0f0f0f" }}>
      <div className="w-full max-w-sm flex flex-col items-center">
        <Image src="/Logo.png" alt="Yos" width={120} height={120} className="h-12 w-auto object-contain mb-8" priority />
        <h1 className="text-2xl font-bold text-white mb-2 text-center">My Membership</h1>
        <p className="text-gray-400 text-base text-center mb-10">Enter your 4-digit PIN to view your attendance</p>

        <div className="flex gap-4 mb-10">
          {digits.map((digit, i) => (
            <input key={i} ref={(el) => { inputs.current[i] = el; }}
              type="tel" inputMode="numeric" maxLength={1} value={digit}
              onChange={(e) => handleChange(i, e)} onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={phase === "loading"} autoFocus={i === 0} onFocus={(e) => e.target.select()}
              className="h-14 w-14 text-center text-2xl font-bold rounded-xl border-2 outline-none text-white transition-colors"
              style={{ background: "#1a1a1a", borderColor: digit ? "#22c55e" : "#374151", caretColor: "#22c55e" }}
            />
          ))}
        </div>

        <button onClick={() => fetch_(digits.join(""), viewMonth, viewYear)}
          disabled={!pinComplete || phase === "loading"}
          className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-3 disabled:opacity-50"
          style={{ background: "#22c55e" }}>
          {phase === "loading" ? <><Spinner /> Loading...</> : "View My Attendance"}
        </button>

        <Link href="/member-checkin" className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Back to Check In
        </Link>
      </div>
    </div>
  );
}
