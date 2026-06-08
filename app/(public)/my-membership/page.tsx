"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from "react";

type Phase = "input" | "loading" | "view" | "error";

type AttendanceRecord = { date: string; checkInTime: string; };

type MemberData = {
  member: { memberId: string; fullName: string; status: string; expiryDate: string | null; packageName: string | null };
  month: number; year: number;
  daysAttended: number;
  records: AttendanceRecord[];
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getDaysInMonth(month: number, year: number) { return new Date(year, month, 0).getDate(); }
function getDayName(dateStr: string) { return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(dateStr).getDay()]; }

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
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
  const [digits, setDigits]   = useState<string[]>(["","","",""]);
  const [phase, setPhase]     = useState<Phase>("input");
  const [errorMsg, setError]  = useState("");
  const [data, setData]       = useState<MemberData | null>(null);
  const [viewMonth, setVMonth] = useState(today.getMonth() + 1);
  const [viewYear, setVYear]  = useState(today.getFullYear());
  const [savedPin, setSaved]  = useState("");
  const [signOutConfirm, setSOC] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-login from session
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
    const totalDays = getDaysInMonth(data.month, data.year);
    const attendedSet = new Set(data.records.map((r) => r.date));
    const recordMap: Record<string, AttendanceRecord> = {};
    for (const r of data.records) recordMap[r.date] = r;
    const isCurrentMonth = viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
    const todayStr = today.toISOString().split("T")[0];

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f" }}>
        {/* Header */}
        <div className="px-4 pt-8 pb-2 flex flex-col items-center">
          <Image src="/Logo.png" alt="Yos" width={120} height={120} className="h-12 w-auto object-contain mb-5" />
          <h1 className="text-xl font-bold text-white">{data.member.fullName}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data.member.memberId}
            {data.member.packageName ? ` · ${data.member.packageName}` : ""}
          </p>
          {data.member.expiryDate && (
            <p className="text-xs mt-1" style={{ color: data.member.status === "ACTIVE" ? "#4ade80" : "#f87171" }}>
              {data.member.status === "ACTIVE" ? "✓ Active" : "✗ Expired"} ·{" "}
              {new Date(data.member.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={() => changeMonth(-1)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white" style={{ background: "#1a1a1a" }}>
            ← Prev
          </button>
          <span className="text-white font-bold">{MONTH_NAMES[data.month - 1]} {data.year}</span>
          <button onClick={() => changeMonth(1)} disabled={isCurrentMonth}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "#1a1a1a" }}>
            Next →
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center py-4 rounded-2xl"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
            <span className="text-3xl font-extrabold leading-none" style={{ color: "#22c55e" }}>
              {data.daysAttended}
            </span>
            <span className="text-xs mt-1.5 font-semibold" style={{ color: "#22c55e", opacity: 0.75 }}>Days Attended</span>
          </div>
          <div className="flex flex-col items-center py-4 rounded-2xl"
            style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}>
            <span className="text-3xl font-extrabold leading-none text-white">{totalDays - data.daysAttended}</span>
            <span className="text-xs mt-1.5 font-semibold text-gray-500">Days Missed</span>
          </div>
        </div>

        {/* Day list */}
        {data.daysAttended === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-white font-semibold text-base mb-1">No visits recorded</p>
            <p className="text-gray-500 text-sm">No check-ins found for {MONTH_NAMES[data.month - 1]} {data.year}.</p>
          </div>
        ) : (
          <div className="px-3 pb-36 space-y-2 flex-1">
            {Array.from({ length: totalDays }, (_, i) => {
              const day = i + 1;
              const dateStr = `${data.year}-${String(data.month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const attended = attendedSet.has(dateStr);
              const rec = recordMap[dateStr];
              const dayName = getDayName(dateStr);
              const isSunday = dayName === "Sun";
              const isToday  = dateStr === todayStr;
              const isFuture = isCurrentMonth && day > today.getDate();

              return (
                <div key={dateStr} className="rounded-xl overflow-hidden"
                  style={{ background: "#141414", borderLeft: isToday ? "3px solid #22c55e" : "3px solid transparent" }}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 flex-shrink-0 text-center">
                      <p className={`text-base font-bold leading-none ${isSunday || isToday ? "text-green-400" : "text-white"}`}>{day}</p>
                      <p className={`text-[10px] mt-0.5 ${isSunday ? "text-green-500" : "text-gray-500"}`}>{dayName}</p>
                    </div>
                    <div className="flex-1">
                      {attended ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md"
                          style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                          ✓ Attended {rec ? `· ${fmt(rec.checkInTime)}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">
                          {isFuture ? "—" : isSunday ? "Sunday" : "Not attended"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 space-y-2"
          style={{ background: "linear-gradient(to top, #0f0f0f 75%, transparent)" }}>
          <Link href="/member-checkin"
            className="block w-full py-3.5 rounded-xl font-semibold text-white text-base text-center"
            style={{ background: "#22c55e" }}>
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
