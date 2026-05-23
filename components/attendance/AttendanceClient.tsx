"use client";

import { useState, useMemo } from "react";
import { Search, CheckCircle2, Users, Clock, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { MarkAttendanceDialog } from "@/components/members/MarkAttendanceDialog";
import { formatTime, daysAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

type AttendanceRecord = {
  id: string; checkInTime: Date; remarks: string | null;
  member: { id: string; memberId: string; fullName: string; phone: string; currentPackage: { name: string } | null };
  markedBy: { name: string };
};

type Member = {
  id: string; memberId: string; fullName: string; phone: string;
  lastAttendanceDate: Date | null; expiryDate: Date | null;
  currentPackage: { name: string } | null; trainer: { fullName: string } | null;
};

type Props = {
  todayAttendance: AttendanceRecord[]; notCheckedIn: Member[];
  totalActive: number; userId: string; userRole: UserRole;
};

export function AttendanceClient({ todayAttendance, notCheckedIn, totalActive, userId, userRole }: Props) {
  const [activeTab, setActiveTab] = useState<"pending" | "checkedin">("pending");
  const [search, setSearch] = useState("");
  const [markFor, setMarkFor] = useState<Member | null>(null);

  const filteredPending = useMemo(() => {
    const q = search.toLowerCase();
    return notCheckedIn.filter((m) =>
      m.fullName.toLowerCase().includes(q) || m.memberId.toLowerCase().includes(q) || m.phone.includes(q)
    );
  }, [notCheckedIn, search]);

  const filteredCheckedIn = useMemo(() => {
    const q = search.toLowerCase();
    return todayAttendance.filter((a) =>
      a.member.fullName.toLowerCase().includes(q) || a.member.memberId.toLowerCase().includes(q)
    );
  }, [todayAttendance, search]);

  const pct = totalActive > 0 ? Math.round((todayAttendance.length / totalActive) * 100) : 0;

  const statCards = [
    { icon: CheckCircle2, label: "Checked In",   value: todayAttendance.length, accent: "#10b981", iconBg: "rgba(16,185,129,0.12)"  },
    { icon: Clock,        label: "Pending",       value: notCheckedIn.length,    accent: "#f97316", iconBg: "rgba(249,115,22,0.12)"  },
    { icon: Users,        label: "Total Active",  value: totalActive,            accent: "#3b82f6", iconBg: "rgba(59,130,246,0.12)"  },
  ];

  return (
    <div className="space-y-5">
      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-2xl p-5"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: s.accent }} />
            <div className="flex items-center justify-between mt-1">
              <div>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">{s.label}</p>
                <p className="text-3xl font-extrabold text-white mt-1">{s.value}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: s.iconBg }}>
                <s.icon className="h-5 w-5" style={{ color: s.accent }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance progress bar */}
      <div className="rounded-2xl px-5 py-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-400">Today's attendance rate</p>
          <p className="text-sm font-extrabold text-orange-400">{pct}%</p>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-600 mt-1.5">{todayAttendance.length} of {totalActive} active members checked in</p>
      </div>

      {/* ── List panel ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Search + tabs */}
        <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID or phone…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e5e7eb", outline: "none" }}
            />
          </div>
          <div className="flex gap-1 rounded-xl p-1 flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
            {[
              { key: "pending"   as const, label: `Pending (${notCheckedIn.length})` },
              { key: "checkedin" as const, label: `Checked In (${todayAttendance.length})` },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={activeTab === tab.key
                  ? { background: "#f97316", color: "#fff" }
                  : { color: "#6b7280" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Pending list ── */}
        {activeTab === "pending" && (
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CheckCircle2 className="h-10 w-10 text-gray-700" />
                <p className="text-sm text-gray-500 font-medium">
                  {search ? "No members match your search" : "All members checked in! 🎉"}
                </p>
              </div>
            ) : (
              filteredPending.map((m, idx) => {
                const lastVisit = m.lastAttendanceDate ? daysAgo(m.lastAttendanceDate) : null;
                const isInactive = lastVisit !== null && lastVisit >= 4;
                return (
                  <div key={m.id}
                    className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02] group"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "#161616" : "#181818" }}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                        {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/members/${m.id}`} className="font-semibold text-white hover:text-orange-400 transition-colors">
                            {m.fullName}
                          </Link>
                          {isInactive && (
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>
                              {lastVisit}d absent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{m.memberId} · {m.currentPackage?.name ?? "No package"}</p>
                      </div>
                    </div>
                    {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "TRAINER") && (
                      <button onClick={() => setMarkFor(m)}
                        className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-bold transition-all flex-shrink-0 ml-4"
                        style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                        <CheckCircle2 className="h-4 w-4" /> Check In
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Checked-in list ── */}
        {activeTab === "checkedin" && (
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredCheckedIn.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CalendarCheck className="h-10 w-10 text-gray-700" />
                <p className="text-sm text-gray-500 font-medium">
                  {search ? "No matching check-ins" : "No check-ins yet today"}
                </p>
              </div>
            ) : (
              filteredCheckedIn.map((a, idx) => (
                <div key={a.id}
                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "#161616" : "#181818" }}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(16,185,129,0.12)" }}>
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/members/${a.member.id}`} className="font-semibold text-white hover:text-orange-400 transition-colors">
                        {a.member.fullName}
                      </Link>
                      <p className="text-xs text-gray-600 mt-0.5">{a.member.memberId} · {a.member.currentPackage?.name ?? "—"}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-base font-extrabold text-emerald-400">{formatTime(a.checkInTime)}</p>
                    <p className="text-xs text-gray-600">by {a.markedBy.name}</p>
                  </div>
                </div>
              ))
            )}
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
    </div>
  );
}
