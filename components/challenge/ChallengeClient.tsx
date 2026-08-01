"use client";

import { useState } from "react";
import { Trophy, Flame, AlertTriangle, Users, CheckCircle2, Search } from "lucide-react";

type Row = {
  memberId: string;
  fullName: string;
  phone: string | null;
  packageName: string | null;
  days: string[];
  count: number;
  needed: number;
  onTrack: boolean;
  completed: boolean;
};

type Stats = {
  totalParticipants: number;
  completed: number;
  onTrack: number;
  atRisk: number;
  dayOfAug: number;
  daysLeft: number;
};

const GOAL = 27;

export function ChallengeClient({ rows, stats }: { rows: Row[]; stats: Stats }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "ontrack" | "atrisk">("all");

  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.memberId.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "completed" && r.completed) ||
      (filter === "ontrack"  && r.onTrack && !r.completed) ||
      (filter === "atrisk"   && !r.onTrack && !r.completed);
    return matchSearch && matchFilter;
  });

  function statusBadge(r: Row) {
    if (r.completed)  return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">🏆 Done</span>;
    if (r.onTrack)    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-500/15 text-green-400 border border-green-500/25">✓ On track</span>;
    return             <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/25">⚠ At risk</span>;
  }

  const progressColor = (pct: number) =>
    pct >= 100 ? "#eab308" : pct >= 60 ? "#22c55e" : pct >= 30 ? "#f97316" : "#ef4444";

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Participants",  value: stats.totalParticipants, icon: Users,         color: "#818cf8" },
          { label: "Completed 🏆", value: stats.completed,         icon: Trophy,        color: "#eab308" },
          { label: "On Track",      value: stats.onTrack,           icon: Flame,         color: "#22c55e" },
          { label: "At Risk",       value: stats.atRisk,            icon: AlertTriangle, color: "#ef4444" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white leading-none">{value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress banner */}
      <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", border: "1px solid #2a2a3a" }}>
        <div>
          <p className="text-white font-bold">Day {stats.dayOfAug} of 31</p>
          <p className="text-gray-400 text-sm">{stats.daysLeft} days remaining · Need {GOAL} workouts to complete</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-500 mb-1">August progress</p>
          <div className="w-40 h-2 rounded-full overflow-hidden" style={{ background: "#2a2a3a" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (stats.dayOfAug / 31) * 100)}%`, background: "#818cf8" }} />
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member or ID…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "completed", "ontrack", "atrisk"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: filter === f ? "#22c55e" : "#1c1c1c",
                color: filter === f ? "#fff" : "#6b7280",
                border: `1px solid ${filter === f ? "#22c55e" : "#2a2a2a"}`,
              }}>
              {f === "all" ? "All" : f === "completed" ? "🏆 Completed" : f === "ontrack" ? "✓ On Track" : "⚠ At Risk"}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_6rem_10rem_7rem] gap-4 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500"
          style={{ background: "#161616", borderBottom: "1px solid #2a2a2a" }}>
          <div>#</div>
          <div>Member</div>
          <div className="text-center">Workouts</div>
          <div>Progress</div>
          <div className="text-center">Status</div>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-600 text-sm" style={{ background: "#111" }}>
            No members match this filter.
          </div>
        )}

        {filtered.map((r, idx) => {
          const pct = Math.min(100, Math.round((r.count / GOAL) * 100));
          const color = progressColor(pct);
          // Find global rank
          const rank = rows.findIndex((x) => x.memberId === r.memberId) + 1;
          return (
            <div key={r.memberId}
              className="grid grid-cols-[2rem_1fr_6rem_10rem_7rem] gap-4 px-4 py-3.5 items-center transition-colors hover:bg-white/[0.02]"
              style={{ background: idx % 2 === 0 ? "#111" : "#131313", borderBottom: "1px solid #1e1e1e" }}>

              {/* Rank */}
              <div className="text-sm font-bold"
                style={{ color: rank === 1 ? "#eab308" : rank === 2 ? "#94a3b8" : rank === 3 ? "#b45309" : "#374151" }}>
                {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
              </div>

              {/* Member info */}
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{r.fullName}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{r.memberId}{r.packageName ? ` · ${r.packageName}` : ""}</p>
              </div>

              {/* Count */}
              <div className="text-center">
                <span className="text-lg font-extrabold" style={{ color }}>{r.count}</span>
                <span className="text-gray-600 text-sm"> / {GOAL}</span>
              </div>

              {/* Progress bar */}
              <div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "#2a2a2a" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}60` }} />
                </div>
                <p className="text-[10px] mt-1" style={{ color: "#4b5563" }}>
                  {r.completed
                    ? "Challenge complete! 🎉"
                    : r.onTrack
                    ? `${r.needed} more needed · on pace`
                    : `${r.needed} needed · ${stats.daysLeft} days left`}
                </p>
              </div>

              {/* Status */}
              <div className="flex justify-center">
                {statusBadge(r)}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-600 text-center">
          Showing {filtered.length} of {rows.length} participants · Only days with both Check-In and Check-Out and ≥ 1 hour workout count
        </p>
      )}
    </div>
  );
}
