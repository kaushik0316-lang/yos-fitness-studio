"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, Trophy, Clock, Calendar, TrendingUp } from "lucide-react";
import { format, addMonths, subMonths, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";

const MIN_CHALLENGE_MINS = 50;

type MemberRow = {
  id: string;
  memberId: string;
  fullName: string;
  packageName: string | null;
  visits: number;
  totalMins: number;
  avgMins: number;
  challengeDays: number;
  daysAttended: Set<number>; // day-of-month
};

type Props = {
  rows: MemberRow[];
  month: number;
  year: number;
  totalDays: number;
  isAugust: boolean;
};

function durationLabel(mins: number) {
  if (!mins) return "—";
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? mins % 60 + "m" : ""}`.trim();
}

export function MonthlyAttendanceView({ rows, month, year, totalDays, isAugust }: Props) {
  const router  = useRouter();
  const [search, setSearch] = useState("");
  const [sort,   setSort]   = useState<"visits" | "hours" | "name">("visits");

  const monthDate = new Date(year, month - 1, 1);

  function navigate(dir: -1 | 1) {
    const d = dir === -1 ? subMonths(monthDate, 1) : addMonths(monthDate, 1);
    router.push(`/attendance?view=month&month=${d.getMonth() + 1}&year=${d.getFullYear()}`);
  }

  const filtered = rows
    .filter((r) =>
      !search ||
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.memberId.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sort === "visits" ? b.visits - a.visits :
      sort === "hours"  ? b.totalMins - a.totalMins :
      a.fullName.localeCompare(b.fullName)
    );

  const totalVisits     = rows.reduce((s, r) => s + r.visits, 0);
  const uniqueMembers   = rows.length;
  const avgVisits       = uniqueMembers > 0 ? Math.round(totalVisits / uniqueMembers) : 0;
  const challengeFinished = isAugust ? rows.filter((r) => r.challengeDays >= 27).length : 0;

  return (
    <div className="space-y-5">
      {/* Month nav */}
      <div className="flex items-center justify-between rounded-2xl px-4 py-3"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors">
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        </button>
        <p className="font-bold text-white text-sm">{format(monthDate, "MMMM yyyy")}</p>
        <button onClick={() => navigate(1)} disabled={monthDate >= new Date()}
          className="p-2 rounded-xl hover:bg-white/[0.06] disabled:opacity-30 transition-colors">
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Members",      value: uniqueMembers,  color: "#a855f7", icon: TrendingUp },
          { label: "Total Visits", value: totalVisits,    color: "#3b82f6", icon: Calendar  },
          { label: "Avg per Member", value: `${avgVisits}x`, color: "#f97316", icon: Clock },
          { label: isAugust ? "Challenge ✓" : "≥50 min days", value: challengeFinished, color: "#eab308", icon: Trophy },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18` }}>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div>
              <p className="text-lg font-extrabold text-white leading-none">{value}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member or ID…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }} />
        </div>
        <div className="flex gap-2">
          {(["visits", "hours", "name"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize"
              style={{
                background: sort === s ? "#f97316" : "#1c1c1c",
                color: sort === s ? "#fff" : "#6b7280",
                border: `1px solid ${sort === s ? "#f97316" : "#2a2a2a"}`,
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Member list */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
        {/* Header */}
        <div className="grid grid-cols-[1fr_5rem_5rem_5rem_auto] gap-4 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500"
          style={{ background: "#161616", borderBottom: "1px solid #2a2a2a" }}>
          <div>Member</div>
          <div className="text-center">Visits</div>
          <div className="text-center">Hrs</div>
          {isAugust && <div className="text-center">Challenge</div>}
          <div>Days</div>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-600 text-sm" style={{ background: "#111" }}>
            No attendance this month.
          </div>
        )}

        {filtered.map((r, idx) => (
          <Link key={r.id} href={`/attendance/${r.id}?month=${month}&year=${year}`}
            className="grid grid-cols-[1fr_5rem_5rem_5rem_auto] gap-4 px-4 py-3.5 items-center transition-colors hover:bg-white/[0.02]"
            style={{ background: idx % 2 === 0 ? "#111" : "#131313", borderBottom: "1px solid #1e1e1e" }}>

            {/* Member */}
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{r.fullName}</p>
              <p className="text-[11px] text-gray-600 mt-0.5">{r.memberId}{r.packageName ? ` · ${r.packageName}` : ""}</p>
            </div>

            {/* Visits */}
            <div className="text-center">
              <span className="text-white font-extrabold text-base">{r.visits}</span>
              <span className="text-gray-600 text-xs"> /{totalDays}</span>
            </div>

            {/* Hours */}
            <div className="text-center">
              <span className="text-blue-400 font-bold text-sm">{durationLabel(r.totalMins)}</span>
            </div>

            {/* Challenge (Aug only) */}
            {isAugust && (
              <div className="text-center">
                <span className="font-bold text-sm" style={{ color: r.challengeDays >= 27 ? "#eab308" : r.challengeDays >= 20 ? "#22c55e" : "#f97316" }}>
                  {r.challengeDays}
                </span>
                {r.challengeDays >= 27 && <span className="ml-1">🏆</span>}
              </div>
            )}

            {/* Mini dot calendar */}
            <div className="flex gap-0.5 flex-wrap max-w-[140px]">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                <div key={d}
                  className="w-3 h-3 rounded-sm"
                  style={{ background: r.daysAttended.has(d) ? "#22c55e" : "rgba(255,255,255,0.05)" }}
                />
              ))}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-600 text-center">
          {filtered.length} members · Click any row to see full attendance history
        </p>
      )}
    </div>
  );
}
