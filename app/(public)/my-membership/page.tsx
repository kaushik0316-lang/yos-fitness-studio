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

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW_LABELS  = ["S","M","T","W","T","F","S"];
const MONTHLY_GOAL = 20;

function getDaysInMonth(month: number, year: number) { return new Date(year, month, 0).getDate(); }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function durationMins(inIso: string, outIso: string | null): number | null {
  if (!outIso) return null;
  return Math.round((new Date(outIso).getTime() - new Date(inIso).getTime()) / 60000);
}

function totalMins(r: AttendanceRecord): number | null {
  const s1 = durationMins(r.checkInTime, r.checkOutTime);
  const s2 = r.session2CheckInTime ? durationMins(r.session2CheckInTime, r.session2CheckOutTime) : null;
  if (s1 === null && s2 === null) return null;
  return (s1 ?? 0) + (s2 ?? 0);
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getMotivation(rate: number, streak: number): { msg: string; emoji: string; color: string } {
  if (streak >= 7)  return { msg: `${streak} days straight — unstoppable!`,      emoji: "🏆", color: "#f59e0b" };
  if (streak >= 5)  return { msg: `${streak} days in a row! Keep going!`,          emoji: "🔥", color: "#f97316" };
  if (rate >= 80)   return { msg: "You're crushing it this month!",                emoji: "💪", color: "#f97316" };
  if (rate >= 60)   return { msg: "Great work! Keep the momentum going.",           emoji: "🔥", color: "#f97316" };
  if (rate >= 40)   return { msg: "Good progress. Push a little harder!",           emoji: "⚡", color: "#fbbf24" };
  if (rate >= 20)   return { msg: "Time to pick up the pace!",                      emoji: "🎯", color: "#fbbf24" };
  return              { msg: "Let's get back on track. You got this!",              emoji: "💡", color: "#6b7280" };
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" style={{ color: "#f97316" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function MyMembershipPage() {
  const today = new Date();
  const [digits, setDigits]      = useState<string[]>(["","","",""]);
  const [phase, setPhase]        = useState<Phase>("input");
  const [errorMsg, setError]     = useState("");
  const [data, setData]          = useState<MemberData | null>(null);
  const [viewMonth, setVMonth]   = useState(today.getMonth() + 1);
  const [viewYear, setVYear]     = useState(today.getFullYear());
  const [savedPin, setSaved]     = useState("");
  const [signOutConfirm, setSOC] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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
    setPhase("loading"); setSelectedDate(null);
    try {
      const res = await fetch("/api/my-membership", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
    const totalDays   = getDaysInMonth(data.month, data.year);
    const attendedSet = new Set(data.records.map((r) => r.date));
    const recordMap: Record<string, AttendanceRecord> = {};
    for (const r of data.records) recordMap[r.date] = r;

    const isCurrentMonth = viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
    const todayStr = today.toISOString().split("T")[0];

    const daysElapsed  = isCurrentMonth ? today.getDate() : totalDays;
    const rate         = daysElapsed > 0 ? Math.round((data.daysAttended / daysElapsed) * 100) : 0;
    const goalPct      = Math.min(100, Math.round((data.daysAttended / MONTHLY_GOAL) * 100));

    // DOW counts
    const dowCounts = [0,0,0,0,0,0,0];
    for (const r of data.records) dowCounts[new Date(r.date + "T00:00:00").getDay()]++;
    const maxDow = Math.max(...dowCounts, 1);

    const firstDow = new Date(data.year, data.month - 1, 1).getDay();

    // Expiry
    const expiryDays = data.member.expiryDate
      ? Math.ceil((new Date(data.member.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const daysSinceLast = data.lastVisitDate
      ? Math.floor((today.getTime() - new Date(data.lastVisitDate + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const streak = data.streak ?? 0;
    const { msg: motivMsg, emoji: motivEmoji, color: motivColor } = getMotivation(rate, streak);

    // Duration per day map (for bar chart)
    const durMap: Record<string, number | null> = {};
    for (const r of data.records) durMap[r.date] = totalMins(r);
    const allDurs = Object.values(durMap).filter((d): d is number => d !== null && d > 0);
    const maxDur  = allDurs.length > 0 ? Math.max(...allDurs) : 0;
    const avgMins = allDurs.length > 0 ? Math.round(allDurs.reduce((a, b) => a + b, 0) / allDurs.length) : null;

    // Selected day detail
    const selRec = selectedDate ? recordMap[selectedDate] : null;
    const selAttended = selectedDate ? attendedSet.has(selectedDate) : false;
    const selMins = selRec ? totalMins(selRec) : null;

    // Bar chart config
    const BAR_W   = 18;
    const BAR_GAP = 5;
    const CHART_H = 90;
    const BAR_MAX_H = 58;
    const svgW = totalDays * (BAR_W + BAR_GAP) + 12;

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a", fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* ── Header ── */}
        <div className="px-4 pt-8 pb-3 flex flex-col items-center">
          <Image src="/Logo.png" alt="Yos" width={96} height={96} className="h-9 w-auto object-contain mb-3" />
          <h1 className="text-lg font-bold text-white tracking-tight">{data.member.fullName}</h1>
          <p className="text-gray-600 text-xs mt-0.5">
            {data.member.memberId}{data.member.packageName ? ` · ${data.member.packageName}` : ""}
          </p>
          {expiryDays !== null && (
            <div className="mt-2 px-3 py-1 rounded-full text-[11px] font-bold"
              style={{
                background: expiryDays < 10 ? "rgba(239,68,68,0.12)" : expiryDays < 30 ? "rgba(249,115,22,0.12)" : "rgba(34,197,94,0.1)",
                color:      expiryDays < 10 ? "#ef4444"               : expiryDays < 30 ? "#f97316"               : "#4ade80",
                border: `1px solid ${expiryDays < 10 ? "rgba(239,68,68,0.3)" : expiryDays < 30 ? "rgba(249,115,22,0.25)" : "rgba(74,222,128,0.2)"}`,
              }}>
              {expiryDays < 0 ? "✗ Expired" : expiryDays === 0 ? "⚠ Expires today" : expiryDays < 30 ? `⚠ ${expiryDays}d left` : `✓ ${expiryDays} days left`}
            </div>
          )}
        </div>

        {/* ── Month nav ── */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <button onClick={() => changeMonth(-1)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors" style={{ background: "#161616" }}>← Prev</button>
          <span className="text-white font-bold text-sm">{MONTH_NAMES[data.month - 1]} {data.year}</span>
          <button onClick={() => changeMonth(1)} disabled={isCurrentMonth}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white disabled:opacity-25 transition-colors"
            style={{ background: "#161616" }}>Next →</button>
        </div>

        {/* ── Streak hero (shown only when streak ≥ 2) ── */}
        {streak >= 2 && (
          <div className="mx-4 mb-3 px-5 py-4 rounded-2xl flex items-center gap-4"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(249,115,22,0.12))", border: "1px solid rgba(245,158,11,0.3)" }}>
            <span className="text-4xl">🔥</span>
            <div>
              <p className="text-2xl font-black leading-none" style={{ color: "#f59e0b" }}>{streak} Day Streak</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: "#78716c" }}>
                {streak >= 14 ? "Two weeks strong! Legendary." : streak >= 7 ? "Full week! You're unstoppable." : "Keep the fire going!"}
              </p>
            </div>
          </div>
        )}

        {/* ── Stats row: 4 compact chips ── */}
        <div className="px-4 pb-3 grid grid-cols-4 gap-2">
          {[
            { val: String(data.daysAttended), label: "Days In",  bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.2)",  color: "#f97316" },
            { val: streak > 0 ? `${streak}🔥` : `${totalDays - data.daysAttended}`, label: streak > 0 ? "Streak" : "Missed", bg: streak > 0 ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)", border: streak > 0 ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)", color: streak > 0 ? "#f59e0b" : "#4b5563" },
            { val: `${rate}%`,              label: "Rate",     bg: rate >= 50 ? "rgba(249,115,22,0.1)" : "rgba(239,68,68,0.08)", border: rate >= 50 ? "rgba(249,115,22,0.2)" : "rgba(239,68,68,0.2)", color: rate >= 50 ? "#f97316" : "#ef4444" },
            { val: avgMins ? fmtDuration(avgMins) : "–", label: "Avg Time", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)", color: "#a78bfa" },
          ].map(({ val, label, bg, border, color }) => (
            <div key={label} className="flex flex-col items-center py-3 rounded-xl" style={{ background: bg, border: `1px solid ${border}` }}>
              <span className="text-base font-extrabold leading-none" style={{ color }}>{val}</span>
              <span className="text-[9px] mt-1 font-semibold text-gray-600 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Monthly goal ── */}
        <div className="mx-4 mb-3 px-4 py-3.5 rounded-2xl" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400">Monthly Goal</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black" style={{ color: goalPct >= 100 ? "#f97316" : "#f97316", opacity: goalPct >= 100 ? 1 : 0.7 }}>
                {goalPct}%
              </span>
              <span className="text-[10px] text-gray-600 font-semibold">{data.daysAttended}/{MONTHLY_GOAL} days</span>
            </div>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "#1e1e1e" }}>
            <div className="h-full rounded-full relative overflow-hidden"
              style={{
                width: `${goalPct}%`,
                background: goalPct >= 100
                  ? "linear-gradient(90deg, #f97316, #fbbf24, #f97316)"
                  : "linear-gradient(90deg, #f97316, #fb923c)",
                transition: "width 0.6s ease",
                backgroundSize: "200% 100%",
              }}>
              {goalPct >= 100 && (
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                  animation: "shimmer 2s infinite",
                }} />
              )}
            </div>
          </div>
          <p className="text-[10px] mt-1.5 font-semibold" style={{ color: goalPct >= 100 ? "#f97316" : "#4b5563" }}>
            {goalPct >= 100
              ? "🎉 Goal achieved!"
              : isCurrentMonth
              ? `${MONTHLY_GOAL - data.daysAttended} more day${MONTHLY_GOAL - data.daysAttended === 1 ? "" : "s"} to go`
              : `Missed by ${MONTHLY_GOAL - data.daysAttended} day${MONTHLY_GOAL - data.daysAttended === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* ── Skyscraper bar chart ── */}
        {(() => {
          const SKY_H     = 200;
          const SKY_BAR_H = 130;
          const SKY_BAR_W = 14;
          const SKY_GAP   = 9;
          const FLOOR_Y   = SKY_H - 22;
          const skyW      = totalDays * (SKY_BAR_W + SKY_GAP) + 16;
          return (
        <div className="mx-4 mb-3 rounded-2xl overflow-hidden" style={{ background: "#080808", border: "1px solid #1a1a1a" }}>
          {/* Header */}
          <div className="px-4 pt-4 pb-0 flex items-end justify-between">
            <div>
              <p className="text-base font-black text-white tracking-tight">Daily Gym Time</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#3a3a3a" }}>{MONTH_NAMES[data.month - 1]} {data.year}</p>
            </div>
            {avgMins && (
              <div className="text-right pb-1">
                <p className="text-xl font-black" style={{ color: "#a78bfa" }}>{fmtDuration(avgMins)}</p>
                <p className="text-[9px] font-semibold" style={{ color: "#3a3a3a" }}>avg / visit</p>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="overflow-x-auto pt-2 pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
            <svg width={skyW} height={SKY_H} style={{ display: "block" }}>
              <defs>
                {/* Skyscraper gradient — bright amber top, deep red base */}
                <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#fde68a" />
                  <stop offset="25%"  stopColor="#f97316" />
                  <stop offset="75%"  stopColor="#c2410c" />
                  <stop offset="100%" stopColor="#431407" />
                </linearGradient>
                {/* Today — even brighter, white top */}
                <linearGradient id="skyGradToday" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#ffffff" />
                  <stop offset="15%"  stopColor="#fde68a" />
                  <stop offset="50%"  stopColor="#f97316" />
                  <stop offset="100%" stopColor="#9a3412" />
                </linearGradient>
                {/* Glow filter */}
                <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                {/* Strong glow for today */}
                <filter id="glowStrong" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Subtle grid lines */}
              {[0.25, 0.5, 0.75, 1].map((pct) => {
                const gy = FLOOR_Y - Math.round(pct * SKY_BAR_H);
                return <line key={pct} x1={0} y1={gy} x2={skyW} y2={gy} stroke="#111" strokeWidth="1" />;
              })}

              {/* Avg line */}
              {avgMins !== null && maxDur > 0 && (() => {
                const avgY = FLOOR_Y - Math.round((avgMins / maxDur) * SKY_BAR_H);
                return (
                  <g>
                    <line x1={0} y1={avgY} x2={skyW} y2={avgY} stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5 4" opacity={0.55} />
                    <rect x={skyW - 38} y={avgY - 9} width={34} height={12} rx={3} fill="#16103a" />
                    <text x={skyW - 21} y={avgY + 1} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#a78bfa">{fmtDuration(avgMins)}</text>
                  </g>
                );
              })()}

              {/* Floor line */}
              <line x1={0} y1={FLOOR_Y} x2={skyW} y2={FLOOR_Y} stroke="#1e1e1e" strokeWidth="1.5" />

              {Array.from({ length: totalDays }, (_, i) => {
                const day      = i + 1;
                const ds       = `${data.year}-${String(data.month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const x        = 8 + i * (SKY_BAR_W + SKY_GAP);
                const isToday  = ds === todayStr;
                const isFuture = isCurrentMonth && day > today.getDate();
                const attended = attendedSet.has(ds);
                const mins     = durMap[ds] ?? null;

                let barH = 0;
                if (attended) {
                  barH = (mins !== null && mins > 0 && maxDur > 0)
                    ? Math.max(14, Math.round((mins / maxDur) * SKY_BAR_H))
                    : 18;
                }
                const y = FLOOR_Y - barH;

                return (
                  <g key={ds}>
                    {/* Subtle spine line for empty days */}
                    {!attended && !isFuture && (
                      <line x1={x + SKY_BAR_W / 2} y1={FLOOR_Y - SKY_BAR_H} x2={x + SKY_BAR_W / 2} y2={FLOOR_Y}
                        stroke="#161616" strokeWidth="1.5" />
                    )}

                    {/* Glow halo behind bar */}
                    {attended && barH > 0 && (
                      <rect x={x} y={y} width={SKY_BAR_W} height={barH} rx={4}
                        fill={isToday ? "url(#skyGradToday)" : "url(#skyGrad)"}
                        filter={isToday ? "url(#glowStrong)" : "url(#glow)"}
                        opacity={isToday ? 0.7 : 0.55}
                      />
                    )}

                    {/* Solid skyscraper bar */}
                    {attended && barH > 0 && (
                      <rect x={x} y={y} width={SKY_BAR_W} height={barH} rx={4}
                        fill={isToday ? "url(#skyGradToday)" : "url(#skyGrad)"}
                      />
                    )}

                    {/* Roof cap — bright horizontal line at top */}
                    {attended && barH > 0 && (
                      <rect x={x} y={y} width={SKY_BAR_W} height={2.5} rx={1.5}
                        fill={isToday ? "#ffffff" : "#fde68a"} opacity={isToday ? 1 : 0.85}
                      />
                    )}

                    {/* Today: pulse ring around the bar */}
                    {isToday && (
                      <rect x={x - 2} y={attended ? y - 2 : FLOOR_Y - SKY_BAR_H}
                        width={SKY_BAR_W + 4} height={attended ? barH + 4 : SKY_BAR_H}
                        rx={6} fill="none" stroke="#f97316" strokeWidth="1.5" opacity={0.5}
                        strokeDasharray="4 3"
                      />
                    )}

                    {/* Duration label — above roof, only if bar tall enough */}
                    {attended && mins !== null && mins >= 20 && barH >= 28 && (
                      <text x={x + SKY_BAR_W / 2} y={y - 6} textAnchor="middle"
                        fontSize="7" fontWeight="900"
                        fill={isToday ? "#fff" : "#fde68a"}>
                        {fmtDuration(mins)}
                      </text>
                    )}

                    {/* Day number below floor */}
                    <text x={x + SKY_BAR_W / 2} y={SKY_H - 5} textAnchor="middle"
                      fontSize="7" fontWeight={isToday ? "800" : "400"}
                      fill={isToday ? "#f97316" : attended ? "#525252" : isFuture ? "#111" : "#1c1c1c"}>
                      {day}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="text-center text-[9px] pb-2.5" style={{ color: "#222" }}>← scroll to see all days →</p>
        </div>
          );
        })()}

        {/* ── Tappable calendar ── */}
        <div className="mx-4 mb-3 px-4 py-3.5 rounded-2xl" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
          <p className="text-xs font-bold text-gray-400 mb-2">{MONTH_NAMES[data.month - 1]} {data.year}</p>

          {/* DOW headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW_LABELS.map((l, i) => (
              <div key={i} className="text-center text-[9px] font-bold" style={{ color: i === 0 ? "#374151" : "#374151" }}>{l}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: totalDays }, (_, i) => {
              const day      = i + 1;
              const ds       = `${data.year}-${String(data.month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const attended = attendedSet.has(ds);
              const isToday  = ds === todayStr;
              const isFuture = isCurrentMonth && day > today.getDate();
              const isSelected = selectedDate === ds;

              return (
                <div key={ds} className="flex justify-center">
                  <button
                    onClick={() => setSelectedDate(isSelected ? null : ds)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: isSelected
                        ? attended ? "#f97316" : "#1e1e1e"
                        : attended
                        ? "rgba(249,115,22,0.2)"
                        : "transparent",
                      border: isSelected
                        ? attended ? "2px solid #f97316" : "2px solid #374151"
                        : isToday
                        ? "2px solid rgba(249,115,22,0.5)"
                        : attended
                        ? "2px solid rgba(249,115,22,0.35)"
                        : "2px solid transparent",
                      boxShadow: isSelected && attended ? "0 0 12px rgba(249,115,22,0.4)" : "none",
                    }}>
                    <span style={{
                      fontSize: "10px",
                      fontWeight: attended || isToday ? 800 : 500,
                      color: isSelected && attended ? "#fff"
                        : attended ? "#fb923c"
                        : isToday ? "rgba(249,115,22,0.7)"
                        : isFuture ? "#1e1e1e"
                        : "#2a2a2a",
                    }}>
                      {day}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Tap detail panel */}
          {selectedDate && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid #1e1e1e" }}>
              <p className="text-xs font-bold text-gray-300 mb-2">{fmtDate(selectedDate)}</p>
              {selAttended && selRec ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Session 1</span>
                    <span className="text-[11px] font-semibold" style={{ color: "#fb923c" }}>
                      {fmtTime(selRec.checkInTime)}
                      {selRec.checkOutTime ? ` → ${fmtTime(selRec.checkOutTime)}` : " (no checkout)"}
                      {selRec.autoCheckedOut && <span className="text-gray-600"> auto</span>}
                    </span>
                  </div>
                  {selRec.session2CheckInTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">Session 2</span>
                      <span className="text-[11px] font-semibold" style={{ color: "#fb923c" }}>
                        {fmtTime(selRec.session2CheckInTime)}
                        {selRec.session2CheckOutTime ? ` → ${fmtTime(selRec.session2CheckOutTime)}` : " (no checkout)"}
                        {selRec.session2AutoCheckedOut && <span className="text-gray-600"> auto</span>}
                      </span>
                    </div>
                  )}
                  {selMins !== null && selMins > 0 && (
                    <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid #1e1e1e" }}>
                      <span className="text-[11px] text-gray-500">Total time</span>
                      <span className="text-sm font-black" style={{ color: "#a78bfa" }}>⏱ {fmtDuration(selMins)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px]" style={{ color: "#374151" }}>
                  {selectedDate > todayStr ? "—" : "Not visited"}
                </p>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-2.5" style={{ borderTop: "1px solid #1e1e1e" }}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "rgba(249,115,22,0.2)", border: "1.5px solid rgba(249,115,22,0.35)" }} />
              <span className="text-[9px] font-semibold text-gray-600">Attended</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ border: "1.5px solid rgba(249,115,22,0.5)" }} />
              <span className="text-[9px] font-semibold text-gray-600">Today</span>
            </div>
            <span className="text-[9px] text-gray-600 ml-auto">Tap a date for details</span>
          </div>
        </div>

        {/* ── Weekly pattern ── */}
        <div className="mx-4 mb-3 px-4 py-3 rounded-2xl" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
          <p className="text-xs font-bold text-gray-400 mb-1">Your Best Days</p>
          <svg viewBox="0 0 280 72" style={{ width: "100%", height: "72px", overflow: "visible" }}>
            <defs>
              <linearGradient id="dowOrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#c2410c" />
              </linearGradient>
            </defs>
            {DOW_LABELS.map((label, i) => {
              const count = dowCounts[i];
              const barH  = count > 0 ? Math.max(6, Math.round((count / maxDow) * 40)) : 4;
              const isSun = i === 0;
              const slotW = 280 / 7;
              const barW  = 22;
              const x     = i * slotW + slotW / 2 - barW / 2;
              const y     = 50 - barH;
              return (
                <g key={i}>
                  <rect x={x} y={50 - 40} width={barW} height={40} rx={4} fill="#161616" />
                  <rect x={x} y={y} width={barW} height={barH} rx={4}
                    fill={count > 0 ? (isSun ? "rgba(249,115,22,0.35)" : "url(#dowOrange)") : "transparent"} />
                  {count > 0 && (
                    <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="8" fontWeight="700"
                      fill={isSun ? "#f97316" : "#fb923c"} opacity={0.9}>{count}</text>
                  )}
                  <text x={x + barW / 2} y={64} textAnchor="middle" fontSize="9" fontWeight="700"
                    fill={count > 0 ? (isSun ? "#6b7280" : "#9ca3af") : "#2a2a2a"}>{label}</text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Motivational banner ── */}
        <div className="mx-4 mb-3 px-4 py-3 rounded-xl flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-xl flex-shrink-0">{motivEmoji}</span>
          <p className="text-sm font-semibold leading-tight" style={{ color: motivColor }}>{motivMsg}</p>
        </div>

        {/* ── Last visit nudge ── */}
        {isCurrentMonth && daysSinceLast !== null && daysSinceLast >= 3 && (
          <div className="mx-4 mb-3 px-4 py-3 rounded-xl flex items-center gap-3"
            style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.18)" }}>
            <span className="text-lg flex-shrink-0">📅</span>
            <p className="text-xs font-semibold leading-snug" style={{ color: "#f97316" }}>
              {daysSinceLast >= 10 ? `${daysSinceLast} days since your last visit. Let's get back!`
               : `${daysSinceLast} days since your last visit. Come back soon!`}
            </p>
          </div>
        )}

        <div className="pb-36" />

        {/* ── Sticky footer ── */}
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 space-y-2"
          style={{ background: "linear-gradient(to top, #0a0a0a 80%, transparent)" }}>
          <Link href="/member-checkin"
            className="block w-full py-3.5 rounded-xl font-bold text-white text-base text-center"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 20px rgba(249,115,22,0.35)" }}>
            Check In Today
          </Link>
          <button onClick={handleSignOut}
            className="block w-full py-2.5 rounded-xl font-medium text-sm text-center transition-colors"
            style={{ background: "#111", color: signOutConfirm ? "#ef4444" : "#374151" }}>
            {signOutConfirm ? "Tap again to confirm" : "Sign Out"}
          </button>
        </div>
      </div>
    );
  }

  // ── ERROR ───────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0a0a0a" }}>
        <div className="text-7xl mb-6">❌</div>
        <h2 className="text-xl font-bold text-white mb-4">Oops!</h2>
        <p className="text-gray-300 text-base mb-10 text-center">{errorMsg}</p>
        <button onClick={() => { setPhase("input"); setDigits(["","","",""]); }}
          className="w-full max-w-xs py-4 rounded-xl font-semibold text-white"
          style={{ background: "#f97316" }}>
          Try Again
        </button>
      </div>
    );
  }

  // ── PIN ENTRY ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0a0a0a" }}>
      <div className="w-full max-w-sm flex flex-col items-center">
        <Image src="/Logo.png" alt="Yos" width={120} height={120} className="h-12 w-auto object-contain mb-8" priority />
        <h1 className="text-2xl font-bold text-white mb-2 text-center">My Membership</h1>
        <p className="text-gray-500 text-sm text-center mb-10">Enter your 4-digit PIN to view your attendance</p>
        <div className="flex gap-4 mb-10">
          {digits.map((digit, i) => (
            <input key={i} ref={(el) => { inputs.current[i] = el; }}
              type="tel" inputMode="numeric" maxLength={1} value={digit}
              onChange={(e) => handleChange(i, e)} onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={phase === "loading"} autoFocus={i === 0} onFocus={(e) => e.target.select()}
              className="h-14 w-14 text-center text-2xl font-bold rounded-xl border-2 outline-none text-white transition-colors"
              style={{ background: "#141414", borderColor: digit ? "#f97316" : "#262626", caretColor: "#f97316" }}
            />
          ))}
        </div>
        <button onClick={() => fetch_(digits.join(""), viewMonth, viewYear)}
          disabled={!pinComplete || phase === "loading"}
          className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-3 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
          {phase === "loading" ? <><Spinner /> Loading…</> : "View My Attendance"}
        </button>
        <Link href="/member-checkin" className="mt-6 text-sm text-gray-600 hover:text-gray-400 transition-colors">
          ← Back to Check In
        </Link>
      </div>
    </div>
  );
}
