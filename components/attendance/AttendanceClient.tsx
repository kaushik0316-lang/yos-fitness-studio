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
  lastAttendanceDate: Date | null;
  expiryDate: Date | null; currentPackage: { name: string } | null;
  trainer: { fullName: string } | null;
};

type Props = {
  todayAttendance: AttendanceRecord[];
  notCheckedIn: Member[];
  totalActive: number;
  userId: string;
  userRole: UserRole;
};

export function AttendanceClient({ todayAttendance, notCheckedIn, totalActive, userId, userRole }: Props) {
  const [activeTab, setActiveTab] = useState<"pending" | "checkedin">("pending");
  const [search, setSearch] = useState("");
  const [markFor, setMarkFor] = useState<Member | null>(null);

  const filteredPending = useMemo(() => {
    const q = search.toLowerCase();
    return notCheckedIn.filter(
      (m) => m.fullName.toLowerCase().includes(q) || m.memberId.toLowerCase().includes(q) || m.phone.includes(q)
    );
  }, [notCheckedIn, search]);

  const filteredCheckedIn = useMemo(() => {
    const q = search.toLowerCase();
    return todayAttendance.filter(
      (a) => a.member.fullName.toLowerCase().includes(q) || a.member.memberId.toLowerCase().includes(q)
    );
  }, [todayAttendance, search]);

  const pct = totalActive > 0 ? Math.round((todayAttendance.length / totalActive) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: CheckCircle2, label: "Checked In", value: todayAttendance.length,
            bg: "bg-emerald-50", iconColor: "text-emerald-600", strip: "bg-emerald-500",
          },
          {
            icon: Clock, label: "Not Yet", value: notCheckedIn.length,
            bg: "bg-orange-50", iconColor: "text-orange-600", strip: "bg-orange-500",
          },
          {
            icon: Users, label: "Total Active", value: totalActive,
            bg: "bg-blue-50", iconColor: "text-blue-600", strip: "bg-blue-500",
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden">
            <div className={`absolute inset-x-0 top-0 h-[3px] ${s.strip}`} />
            <div className="flex items-center justify-between mt-1">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={`${s.bg} rounded-xl p-3`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance progress bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Today's attendance rate</p>
          <p className="text-sm font-extrabold text-orange-600">{pct}%</p>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">{todayAttendance.length} of {totalActive} active members checked in</p>
      </div>

      {/* ── List panel ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Search + tabs */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID or phone…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
            />
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-shrink-0">
            {[
              { key: "pending" as const, label: `Pending (${notCheckedIn.length})` },
              { key: "checkedin" as const, label: `Checked In (${todayAttendance.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Pending list ── */}
        {activeTab === "pending" && (
          <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
            {filteredPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CheckCircle2 className="h-10 w-10 text-gray-200" />
                <p className="text-sm text-gray-400 font-medium">
                  {search ? "No members match your search" : "All members checked in! 🎉"}
                </p>
              </div>
            ) : (
              filteredPending.map((m) => {
                const lastVisit = m.lastAttendanceDate ? daysAgo(m.lastAttendanceDate) : null;
                const isInactive = lastVisit !== null && lastVisit >= 4;

                return (
                  <div key={m.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-extrabold text-gray-500 flex-shrink-0">
                        {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/members/${m.id}`} className="font-semibold text-gray-900 hover:text-orange-600 transition-colors">
                            {m.fullName}
                          </Link>
                          {isInactive && (
                            <span className="text-[11px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded-md">
                              {lastVisit}d absent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{m.memberId} · {m.currentPackage?.name ?? "No package"}</p>
                      </div>
                    </div>

                    {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "TRAINER") && (
                      <button
                        onClick={() => setMarkFor(m)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-200 flex-shrink-0 ml-4"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Check In
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
          <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
            {filteredCheckedIn.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CalendarCheck className="h-10 w-10 text-gray-200" />
                <p className="text-sm text-gray-400 font-medium">
                  {search ? "No matching check-ins" : "No check-ins yet today"}
                </p>
              </div>
            ) : (
              filteredCheckedIn.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/members/${a.member.id}`} className="font-semibold text-gray-900 hover:text-orange-600 transition-colors">
                        {a.member.fullName}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">{a.member.memberId} · {a.member.currentPackage?.name ?? "—"}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-base font-extrabold text-emerald-600">{formatTime(a.checkInTime)}</p>
                    <p className="text-xs text-gray-400">by {a.markedBy.name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {markFor && (
        <MarkAttendanceDialog
          open={!!markFor}
          onClose={() => setMarkFor(null)}
          member={{ id: markFor.id, memberId: markFor.memberId, fullName: markFor.fullName }}
          userId={userId}
        />
      )}
    </div>
  );
}
