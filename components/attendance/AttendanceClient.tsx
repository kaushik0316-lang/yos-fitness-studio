"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, CheckCircle2, Clock, CalendarCheck, ChevronLeft, ChevronRight,
  LogOut, Dumbbell, Users, Timer, TrendingUp, Calendar, Trophy, Pencil,
} from "lucide-react";
import Link from "next/link";
import { MarkAttendanceDialog } from "@/components/members/MarkAttendanceDialog";
import { ManualAttendanceDialog } from "@/components/attendance/ManualAttendanceDialog";
import { CheckOutDialog } from "@/components/attendance/CheckOutDialog";
import { EditAttendanceDialog } from "@/components/attendance/EditAttendanceDialog";
import { formatTime, daysAgo } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import { format, addDays, subDays, differenceInMinutes, parseISO } from "date-fns";
import type { UserRole } from "@prisma/client";

type AttendanceRecord = {
  id: string;
  checkInTime: string;
  checkOutTime: string | null;
  autoCheckedOut: boolean;
  remarks: string | null;
  session2CheckInTime: string | null;
  session2CheckOutTime: string | null;
  session2AutoCheckedOut: boolean;
  member: {
    id: string; memberId: string; fullName: string; phone: string; gender: string | null;
    expiryDate: string | null; lastAttendanceDate: string | null;
    currentPackage: { name: string } | null;
    memberships: { package: { name: string } | null; expiryDate: string | null }[];
    trainer: { fullName: string } | null;
  };
  markedBy: { name: string };
};

type Member = {
  id: string; memberId: string; fullName: string; phone: string; gender: string | null;
  lastAttendanceDate: string | null; expiryDate: string | null;
  currentPackage: { name: string } | null;
  memberships: { package: { name: string } | null; expiryDate: string | null }[];
  trainer: { fullName: string } | null;
};

type Props = {
  todayAttendance: AttendanceRecord[];
  allMembers: { id: string; memberId: string; fullName: string; phone: string }[];
  totalActive: number;
  userId: string;
  userRole: UserRole;
  selectedDate: string;
  isToday: boolean;
  weekVisitsMap: Record<string, number>;
  streakMap: Record<string, number>;
};

function pkgName(m: { currentPackage: { name: string } | null; memberships: { package: { name: string } | null }[] }): string | null {
  return m.memberships?.[0]?.package?.name ?? m.currentPackage?.name ?? null;
}

function durationLabel(checkIn: string, checkOut: string | null): string | null {
  if (!checkOut) return null;
  const mins = differenceInMinutes(parseISO(checkOut), parseISO(checkIn));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function expiryWarning(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const days = differenceInMinutes(parseISO(expiryDate), new Date()) / (60 * 24);
  return Math.ceil(days);
}

function Initials({ name, size = 10 }: { name: string; size?: number }) {
  const letters = name.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase();
  const colors = [
    ["rgba(249,115,22,0.18)", "#fb923c"],
    ["rgba(168,85,247,0.18)", "#c084fc"],
    ["rgba(59,130,246,0.18)", "#60a5fa"],
    ["rgba(16,185,129,0.18)", "#34d399"],
    ["rgba(236,72,153,0.18)", "#f472b6"],
  ];
  const [bg, fg] = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-${size} h-${size} rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0`}
      style={{ background: bg, color: fg }}>
      {letters}
    </div>
  );
}

export function AttendanceClient({
  todayAttendance, allMembers, totalActive, userId, userRole,
  selectedDate, isToday, weekVisitsMap, streakMap,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab]       = useState<"inGym" | "visited" | "pending">("inGym");
  const [search, setSearch]             = useState("");
  const [markFor, setMarkFor]           = useState<Member | null>(null);
  const [manualOpen, setManualOpen]     = useState(false);
  const [checkOutFor, setCheckOutFor]   = useState<typeof todayAttendance[0] | null>(null);
  const [editRecord,  setEditRecord]    = useState<typeof todayAttendance[0] | null>(null);

  // Lazy-load "not checked in" members only when the pending tab is first opened
  const [notCheckedIn, setNotCheckedIn] = useState<Member[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const pendingFetched = useRef<string | null>(null); // tracks which date was fetched

  useEffect(() => {
    if (activeTab !== "pending") return;
    if (pendingFetched.current === selectedDate) return;
    pendingFetched.current = selectedDate;
    setPendingLoading(true);
    fetch(`/api/attendance/pending?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setNotCheckedIn(data); })
      .finally(() => setPendingLoading(false));
  }, [activeTab, selectedDate]);

  const inGym    = useMemo(() => todayAttendance.filter((a) => !a.checkOutTime), [todayAttendance]);
  const visited  = todayAttendance;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const completedVisits = todayAttendance.filter((a) => a.checkOutTime);
  const avgDuration = useMemo(() => {
    if (!completedVisits.length) return null;
    const total = completedVisits.reduce((s, a) => {
      return s + differenceInMinutes(parseISO(a.checkOutTime!), parseISO(a.checkInTime));
    }, 0);
    const avg = Math.round(total / completedVisits.length);
    if (avg < 60) return `${avg}m`;
    return `${Math.floor(avg / 60)}h ${avg % 60}m`;
  }, [completedVisits]);

  const peakHour = useMemo(() => {
    if (!todayAttendance.length) return null;
    const counts: Record<number, number> = {};
    todayAttendance.forEach((a) => {
      const h = parseISO(a.checkInTime).getHours();
      counts[h] = (counts[h] ?? 0) + 1;
    });
    const peak = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!peak) return null;
    const h = parseInt(peak[0]);
    return `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
  }, [todayAttendance]);

  // Hourly distribution (6am–9pm)
  const hourlyData = useMemo(() => {
    const hours: Record<number, number> = {};
    todayAttendance.forEach((a) => {
      const h = parseISO(a.checkInTime).getHours();
      hours[h] = (hours[h] ?? 0) + 1;
    });
    const slots = [];
    for (let h = 5; h <= 21; h++) slots.push({ h, count: hours[h] ?? 0 });
    return slots;
  }, [todayAttendance]);
  const maxHourly = Math.max(...hourlyData.map((s) => s.count), 1);

  const pct = totalActive > 0 ? Math.round((todayAttendance.length / totalActive) * 100) : 0;

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filteredInGym   = inGym.filter((a) =>
    a.member.fullName.toLowerCase().includes(q) || a.member.memberId.toLowerCase().includes(q) || a.member.phone.includes(q)
  );
  const filteredVisited = visited.filter((a) =>
    a.member.fullName.toLowerCase().includes(q) || a.member.memberId.toLowerCase().includes(q) || a.member.phone.includes(q)
  );
  const filteredPending = notCheckedIn.filter((m) =>
    m.fullName.toLowerCase().includes(q) || m.memberId.toLowerCase().includes(q) || m.phone.includes(q)
  );

  // ── Date navigation ─────────────────────────────────────────────────────────
  function goDate(d: Date) {
    router.push(`/attendance?date=${format(d, "yyyy-MM-dd")}`);
  }
  const dateObj  = parseISO(selectedDate);
  const isFuture = parseISO(selectedDate) > new Date();

  // ── Shared row styles ───────────────────────────────────────────────────────
  const rowBase = "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.025] border-b border-white/[0.04]";

  return (
    <div className="space-y-4">

      {/* ── Date nav ── */}
      <div className="flex items-center justify-between rounded-2xl px-4 py-3"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => goDate(subDays(dateObj, 1))}
          className="p-2 rounded-xl transition-colors hover:bg-white/[0.06]">
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        </button>
        <div className="relative text-center">
          <label className="cursor-pointer group">
            <p className="text-white font-bold text-sm group-hover:text-orange-400 transition-colors">
              {isToday ? "Today" : format(dateObj, "EEEE, d MMMM")}
            </p>
            <p className="text-gray-600 text-[11px] mt-0.5 group-hover:text-gray-500 transition-colors">
              {format(dateObj, "yyyy")} · tap to jump
            </p>
            <input
              key={selectedDate}
              type="date"
              max={format(new Date(), "yyyy-MM-dd")}
              defaultValue={selectedDate}
              onChange={(e) => { if (e.target.value) goDate(parseISO(e.target.value)); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
          </label>
        </div>
        <button onClick={() => goDate(addDays(dateObj, 1))} disabled={isFuture}
          className="p-2 rounded-xl transition-colors hover:bg-white/[0.06] disabled:opacity-30">
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Dumbbell,      label: "In Gym",        value: inGym.length,            sub: "right now",         accent: "#10b981", iconBg: "rgba(16,185,129,0.12)" },
          { icon: CalendarCheck, label: "Visited",        value: todayAttendance.length,  sub: "total check-ins",   accent: "#a855f7", iconBg: "rgba(168,85,247,0.12)" },
          { icon: Clock,         label: "Pending",        value: totalActive - todayAttendance.length,  sub: "not yet in", accent: "#f97316", iconBg: "rgba(249,115,22,0.12)" },
          { icon: Users,         label: "Active Members", value: totalActive,             sub: `${pct}% checked in`, accent: "#3b82f6", iconBg: "rgba(59,130,246,0.12)" },
        ].map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-2xl p-4"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl" style={{ background: s.accent }} />
            <div className="flex items-start justify-between mt-1">
              <div>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{s.label}</p>
                <p className="text-2xl font-extrabold text-white mt-1">{s.value}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{s.sub}</p>
              </div>
              <div className="rounded-xl p-2.5 mt-0.5" style={{ background: s.iconBg }}>
                <s.icon className="h-4 w-4" style={{ color: s.accent }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Secondary stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl p-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-3.5 w-3.5 text-gray-500" />
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Avg Duration</p>
          </div>
          <p className="text-xl font-extrabold text-white">{avgDuration ?? "—"}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">{completedVisits.length} completed visits</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-gray-500" />
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Peak Hour</p>
          </div>
          <p className="text-xl font-extrabold text-white">{peakHour ?? "—"}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">busiest check-in time</p>
        </div>
        <div className="rounded-2xl p-4 col-span-2 sm:col-span-1" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Attendance Rate</p>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <p className="text-xl font-extrabold text-white">{pct}%</p>
            <p className="text-[11px] text-gray-600 mb-0.5">{todayAttendance.length} / {totalActive}</p>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg,#f97316,#ea580c)" }} />
          </div>
        </div>
      </div>

      {/* ── Hourly heatmap ── */}
      {todayAttendance.length > 0 && (
        <div className="rounded-2xl px-4 py-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">Check-in distribution</p>
          <div className="flex items-end gap-1 h-10">
            {hourlyData.map(({ h, count }) => {
              const height = count > 0 ? Math.max(4, Math.round((count / maxHourly) * 40)) : 2;
              const label = h % 12 || 12;
              const ampm = h < 12 ? "a" : "p";
              return (
                <div key={h} className="flex flex-col items-center gap-1 flex-1" title={`${label}${ampm}m: ${count} check-ins`}>
                  <div className="w-full rounded-sm transition-all"
                    style={{ height: `${height}px`, background: count > 0 ? "#f97316" : "rgba(255,255,255,0.06)", opacity: count > 0 ? Math.max(0.3, count / maxHourly) : 1 }} />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-1">
            {hourlyData.map(({ h }) => (
              <div key={h} className="flex-1 text-center text-[8px] text-gray-700">
                {h % 3 === 0 ? (h % 12 || 12) + (h < 12 ? "a" : "p") : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top Streaks ── */}
      {(() => {
        const topStreaks = todayAttendance
          .map((a) => ({ name: a.member.fullName, memberId: a.member.id, streak: streakMap[a.member.id] ?? 0 }))
          .filter((s) => s.streak >= 3)
          .sort((a, b) => b.streak - a.streak)
          .slice(0, 5);
        if (topStreaks.length === 0) return null;
        return (
          <div className="rounded-2xl px-4 py-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">🔥 Active Streaks</p>
            <div className="flex flex-wrap gap-2">
              {topStreaks.map((s) => (
                <div key={s.memberId} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: s.streak >= 14 ? "rgba(234,179,8,0.1)" : s.streak >= 7 ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.04)", border: s.streak >= 14 ? "1px solid rgba(234,179,8,0.25)" : s.streak >= 7 ? "1px solid rgba(249,115,22,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-base leading-none">{s.streak >= 14 ? "🏆" : s.streak >= 7 ? "🔥" : "⚡"}</span>
                  <div>
                    <p className="text-white text-xs font-bold leading-none">{toTitleCase(s.name)}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: s.streak >= 14 ? "#fbbf24" : s.streak >= 7 ? "#fb923c" : "#6b7280" }}>{s.streak} day streak</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── List panel ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Search + tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID or phone…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#e5e7eb" }} />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)" }}>
              {([
                { key: "inGym"   as const, label: `In Gym`, count: inGym.length,           accent: "#10b981" },
                { key: "visited" as const, label: `Visited`, count: todayAttendance.length, accent: "#a855f7" },
                { key: "pending" as const, label: `Pending`, count: totalActive - todayAttendance.length, accent: "#f97316" },
              ]).map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                  style={activeTab === tab.key
                    ? { background: tab.accent, color: "#fff" }
                    : { color: "#6b7280" }}>
                  {tab.label}
                  <span className="text-[10px] font-extrabold px-1 py-0.5 rounded-md"
                    style={activeTab === tab.key
                      ? { background: "rgba(0,0,0,0.2)", color: "#fff" }
                      : { background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <Link href={`/attendance?view=month&month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}>
              <CalendarCheck className="h-3.5 w-3.5" />
              Month View
            </Link>
            <Link href="/challenge"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: "rgba(234,179,8,0.12)", color: "#eab308", border: "1px solid rgba(234,179,8,0.2)" }}>
              <Trophy className="h-3.5 w-3.5" />
              Aug Challenge
            </Link>
            {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
              <button onClick={() => setManualOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>
                + Manual Entry
              </button>
            )}
          </div>
        </div>

        {/* ── In Gym ── */}
        {activeTab === "inGym" && (
          <div className="divide-y divide-white/[0.04]">
            {filteredInGym.length === 0 ? (
              <Empty icon={<Dumbbell className="h-8 w-8 text-gray-700" />} label={search ? "No matches" : "Nobody in the gym right now"} />
            ) : filteredInGym.map((a) => {
              const mins = differenceInMinutes(new Date(), parseISO(a.checkInTime));
              const minsLabel = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
              const pkg = pkgName(a.member);
              const expDays = expiryWarning(a.member.expiryDate);
              const streak = streakMap[a.member.id] ?? 0;
              return (
                <div key={a.id} className={rowBase}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.12)" }}>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/attendance/${a.member.id}`} className="font-semibold text-white hover:text-orange-400 transition-colors text-sm">
                        {toTitleCase(a.member.fullName)}
                      </Link>
                      {streak >= 3 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: streak >= 14 ? "rgba(234,179,8,0.15)" : "rgba(249,115,22,0.12)", color: streak >= 14 ? "#fbbf24" : "#fb923c" }}>
                          {streak >= 14 ? "🏆" : "🔥"} {streak}d
                        </span>
                      )}
                      {expDays !== null && expDays <= 7 && expDays > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>
                          exp {expDays}d
                        </span>
                      )}
                      {expDays !== null && expDays <= 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                          expired
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {a.member.memberId}
                      {pkg && <> · <span className="text-gray-500">{pkg}</span></>}
                      {a.member.trainer && <> · <span className="text-gray-600">{toTitleCase(a.member.trainer.fullName)}</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-emerald-400">{formatTime(new Date(a.checkInTime))}</p>
                      <p className="text-xs text-emerald-700 mt-0.5">{minsLabel} inside</p>
                    </div>
                    {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
                      <button
                        onClick={() => setCheckOutFor(a)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                        Check Out
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Visited ── */}
        {activeTab === "visited" && (
          <div className="divide-y divide-white/[0.04]">
            {filteredVisited.length === 0 ? (
              <Empty icon={<CalendarCheck className="h-8 w-8 text-gray-700" />} label={search ? "No matches" : "No check-ins yet"} />
            ) : filteredVisited.map((a) => {
              const checkedOut = !!a.checkOutTime;
              const dur = durationLabel(a.checkInTime, a.checkOutTime);
              const pkg = pkgName(a.member);
              const expDays = expiryWarning(a.member.expiryDate);
              const weekCount = weekVisitsMap[a.member.id] ?? 0;
              const streak = streakMap[a.member.id] ?? 0;
              return (
                <div key={a.id} className={rowBase}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: checkedOut ? "rgba(59,130,246,0.10)" : "rgba(16,185,129,0.10)" }}>
                    {checkedOut
                      ? <LogOut className="h-4.5 w-4.5" style={{ color: "#60a5fa" }} />
                      : <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/attendance/${a.member.id}`} className="font-semibold text-white hover:text-orange-400 transition-colors text-sm">
                        {toTitleCase(a.member.fullName)}
                      </Link>
                      {streak >= 3 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: streak >= 14 ? "rgba(234,179,8,0.15)" : "rgba(249,115,22,0.12)", color: streak >= 14 ? "#fbbf24" : "#fb923c" }}>
                          {streak >= 14 ? "🏆" : "🔥"} {streak}d
                        </span>
                      )}
                      {dur && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(59,130,246,0.12)", color: "#93c5fd" }}>
                          {dur}
                        </span>
                      )}
                      {a.session2CheckInTime && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
                          2×
                        </span>
                      )}
                      {a.autoCheckedOut && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.06)", color: "#6b7280" }}>
                          auto-out
                        </span>
                      )}
                      {expDays !== null && expDays <= 7 && expDays > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>
                          exp {expDays}d
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {a.member.memberId}
                      {pkg && <> · <span className="text-gray-500">{pkg}</span></>}
                      {weekCount > 1 && <> · <span className="text-gray-600">{weekCount}× this week</span></>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-extrabold text-emerald-400">{formatTime(new Date(a.checkInTime))}</p>
                    {checkedOut ? (
                      <p className="text-xs font-semibold mt-0.5" style={{ color: "#60a5fa" }}>
                        → {formatTime(new Date(a.checkOutTime!))}
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-700 mt-0.5">still inside</p>
                    )}
                    {a.session2CheckInTime && (
                      <p className="text-xs font-extrabold text-emerald-400 mt-1">{formatTime(new Date(a.session2CheckInTime))}</p>
                    )}
                    {a.session2CheckInTime && a.session2CheckOutTime && (
                      <p className="text-xs font-semibold mt-0.5" style={{ color: "#60a5fa" }}>
                        → {formatTime(new Date(a.session2CheckOutTime))}
                      </p>
                    )}
                    {a.session2CheckInTime && !a.session2CheckOutTime && (
                      <p className="text-xs text-emerald-700 mt-0.5">still inside</p>
                    )}
                  </div>
                  {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
                    <button onClick={() => setEditRecord(a)}
                      className="flex-shrink-0 p-2 rounded-lg text-gray-700 hover:text-orange-400 transition-colors ml-1"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                      title="Edit times">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pending ── */}
        {activeTab === "pending" && (
          <div className="divide-y divide-white/[0.04]">
            {pendingLoading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-gray-500 text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                Loading members…
              </div>
            ) : filteredPending.length === 0 ? (
              <Empty icon={<CheckCircle2 className="h-8 w-8 text-emerald-700" />} label={search ? "No matches" : "All members checked in! 🎉"} />
            ) : filteredPending.map((m) => {
              const lastVisit  = m.lastAttendanceDate ? daysAgo(new Date(m.lastAttendanceDate)) : null;
              const absent     = lastVisit !== null && lastVisit >= 4;
              const longAbsent = lastVisit !== null && lastVisit >= 14;
              const pkg        = pkgName(m);
              const expDays    = expiryWarning(m.expiryDate);
              const expiringSoon = expDays !== null && expDays <= 7 && expDays > 0;
              const expired    = expDays !== null && expDays <= 0;
              const weekCount  = weekVisitsMap[m.id] ?? 0;
              return (
                <div key={m.id} className={rowBase}>
                  <Initials name={m.fullName} size={10} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/members/${m.id}`} className="font-semibold text-white hover:text-orange-400 transition-colors text-sm">
                        {toTitleCase(m.fullName)}
                      </Link>
                      {longAbsent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                          {lastVisit}d absent
                        </span>
                      )}
                      {absent && !longAbsent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>
                          {lastVisit}d absent
                        </span>
                      )}
                      {expiringSoon && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(249,115,22,0.10)", color: "#fbbf24" }}>
                          exp {expDays}d
                        </span>
                      )}
                      {expired && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                          expired
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {m.memberId}
                      {pkg && <> · <span className="text-gray-500">{pkg}</span></>}
                      {m.trainer && <> · <span className="text-gray-600">{toTitleCase(m.trainer.fullName)}</span></>}
                      {weekCount > 0 && <> · <span className="text-gray-600">{weekCount}× this week</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {(() => {
                      const phone = (m.phone ?? "").replace(/\D/g, "").slice(-10);
                      if (!phone) return null;
                      const firstName = m.fullName.split(" ")[0];
                      const nudge = expiringSoon
                        ? `Hi ${firstName}! Your Yos membership expires in ${expDays} day${expDays === 1 ? "" : "s"}. Come renew today and keep your streak going! 💪`
                        : expired
                        ? `Hi ${firstName}! Your Yos membership has expired. Come in today to renew and get back on track! 💪`
                        : `Hi ${firstName}! We missed you at Yos today. See you tomorrow? 💪`;
                      return (
                        <a href={`https://wa.me/91${phone}?text=${encodeURIComponent(nudge)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition-all"
                          style={{ background: "rgba(37,211,102,0.12)", color: "#25d366", border: "1px solid rgba(37,211,102,0.2)" }}>
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          <span className="hidden sm:inline">Nudge</span>
                        </a>
                      );
                    })()}
                    {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "TRAINER") && (
                      <button onClick={() => setMarkFor(m)}
                        className="flex items-center gap-1.5 px-3 py-2 text-white rounded-xl text-xs font-bold transition-all"
                        style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Check In</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {markFor && (
        <MarkAttendanceDialog
          open={!!markFor} onClose={() => setMarkFor(null)}
          member={{ id: markFor.id, memberId: markFor.memberId, fullName: markFor.fullName }}
          userId={userId}
        />
      )}

      <ManualAttendanceDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        allMembers={allMembers}
        defaultDate={selectedDate}
      />

      {editRecord && (
        <EditAttendanceDialog
          open={!!editRecord}
          onClose={() => { setEditRecord(null); router.refresh(); }}
          record={{
            id:             editRecord.id,
            date:           selectedDate,
            checkInTime:    editRecord.checkInTime,
            checkOutTime:   editRecord.checkOutTime,
            autoCheckedOut: editRecord.autoCheckedOut,
            remarks:        editRecord.remarks,
          }}
          member={{ fullName: editRecord.member.fullName, memberId: editRecord.member.memberId }}
        />
      )}

      {checkOutFor && (
        <CheckOutDialog
          open={!!checkOutFor}
          onClose={() => setCheckOutFor(null)}
          attendance={{
            id: checkOutFor.id,
            checkInTime: checkOutFor.checkInTime,
            checkOutTime: checkOutFor.checkOutTime,
          }}
          member={{
            fullName: checkOutFor.member.fullName,
            memberId: checkOutFor.member.memberId,
          }}
        />
      )}
    </div>
  );
}

function Empty({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      {icon}
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </div>
  );
}
