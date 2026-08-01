"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Trophy, Clock, Calendar, Flame, ArrowLeft } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { EditAttendanceDialog } from "@/components/attendance/EditAttendanceDialog";
import Link from "next/link";

type DayRecord = {
  id: string;
  date: string;           // "YYYY-MM-DD"
  checkInTime: string;    // ISO UTC
  checkOutTime: string | null;
  autoCheckedOut: boolean;
  remarks: string | null;
  durationMins: number | null;
};

type Props = {
  member: {
    id: string; memberId: string; fullName: string; phone: string;
    expiryDate: string | null; status: string;
    currentPackage: { name: string } | null;
  };
  records: DayRecord[];
  month: number; // 1-12
  year: number;
  isAugust: boolean;
  userRole: string;
};

const MIN_CHALLENGE_MINS = 50;

function fmtIST(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function durationLabel(mins: number) {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? mins % 60 + "m" : ""}`.trim();
}

export function MemberAttendanceDetail({ member, records, month, year, isAugust, userRole }: Props) {
  const router   = useRouter();
  const [editRecord, setEditRecord] = useState<DayRecord | null>(null);
  const canEdit  = userRole === "ADMIN" || userRole === "FRONT_DESK";

  const monthDate  = new Date(year, month - 1, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd   = endOfMonth(monthDate);

  function navigate(dir: -1 | 1) {
    const d = dir === -1 ? subMonths(monthDate, 1) : addMonths(monthDate, 1);
    router.push(`/attendance/${member.id}?month=${d.getMonth() + 1}&year=${d.getFullYear()}`);
  }

  // Build a map for quick lookup
  const recordMap = new Map<string, DayRecord>();
  for (const r of records) recordMap.set(r.date, r);

  // Stats
  const totalVisits   = records.length;
  const totalMins     = records.reduce((s, r) => s + (r.durationMins ?? 0), 0);
  const avgMins       = totalVisits > 0 ? Math.round(totalMins / totalVisits) : 0;
  const challengeDays = records.filter((r) => (r.durationMins ?? 0) >= MIN_CHALLENGE_MINS).length;

  // Weeks
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-5">
      {/* Back + member header */}
      <div className="flex items-center gap-3">
        <Link href="/attendance"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
          <ArrowLeft className="h-4 w-4" /> Attendance
        </Link>
        <Link href={`/members/${member.id}`} className="group flex-1 min-w-0">
          <p className="font-bold text-white group-hover:text-orange-400 transition-colors truncate">{member.fullName}</p>
          <p className="text-xs text-gray-600">{member.memberId}{member.currentPackage ? ` · ${member.currentPackage.name}` : ""}</p>
        </Link>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{
            background: member.status === "ACTIVE" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color:      member.status === "ACTIVE" ? "#4ade80" : "#f87171",
          }}>
          {member.status}
        </span>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between rounded-2xl px-4 py-3"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors">
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        </button>
        <p className="font-bold text-white text-sm">{format(monthDate, "MMMM yyyy")}</p>
        <button onClick={() => navigate(1)} disabled={monthDate >= new Date()}
          className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors disabled:opacity-30">
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Calendar, label: "Visits",       value: totalVisits,                            color: "#a855f7" },
          { icon: Clock,    label: "Total Time",    value: totalMins > 0 ? durationLabel(totalMins) : "—", color: "#3b82f6" },
          { icon: Flame,    label: "Avg Duration",  value: avgMins > 0 ? durationLabel(avgMins) : "—",    color: "#f97316" },
          { icon: Trophy,   label: isAugust ? "Challenge Days" : "≥ 50 min days", value: challengeDays, color: "#eab308" },
        ].map(({ icon: Icon, label, value, color }) => (
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

      {/* Aug Challenge progress */}
      {isAugust && (
        <div className="rounded-2xl px-5 py-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <p className="text-sm font-bold text-white">August Challenge</p>
            </div>
            <p className="text-sm font-bold" style={{ color: challengeDays >= 27 ? "#eab308" : challengeDays >= 20 ? "#22c55e" : "#f97316" }}>
              {challengeDays} / 27
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (challengeDays / 27) * 100)}%`, background: challengeDays >= 27 ? "#eab308" : "#22c55e" }} />
          </div>
          <p className="text-[10px] text-gray-600 mt-1.5">
            {challengeDays >= 27 ? "🏆 Challenge complete!" : `${27 - challengeDays} more days needed · only ≥50 min workouts count`}
          </p>
        </div>
      )}

      {/* Mini dot calendar */}
      <div className="rounded-2xl px-5 py-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">Days attended</p>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {["M","T","W","T","F","S","S"].map((d, i) => (
            <div key={i} className="text-[9px] font-bold text-gray-700">{d}</div>
          ))}
          {eachDayOfInterval({ start: monthStart, end: monthEnd }).map((day) => {
            const dayOfWeek = (day.getDay() + 6) % 7; // Mon=0
            const isFirst   = day.getDate() === 1;
            const ds        = format(day, "yyyy-MM-dd");
            const visited   = recordMap.has(ds);
            const rec       = recordMap.get(ds);
            const counts    = visited && (rec?.durationMins ?? 0) >= MIN_CHALLENGE_MINS;
            const isToday   = ds === todayStr;
            return (
              <div key={ds}
                title={visited ? `${fmtIST(rec!.checkInTime)}${rec!.checkOutTime ? ` → ${fmtIST(rec!.checkOutTime)}` : ""}` : ""}
                className="aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all"
                style={{
                  gridColumnStart: isFirst ? dayOfWeek + 1 : undefined,
                  background: visited ? (counts ? "rgba(234,179,8,0.25)" : "rgba(34,197,94,0.2)") : "rgba(255,255,255,0.04)",
                  color: visited ? (counts ? "#fbbf24" : "#4ade80") : isToday ? "#6b7280" : "#374151",
                  border: isToday ? "1px solid rgba(249,115,22,0.4)" : "1px solid transparent",
                }}>
                {day.getDate()}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(234,179,8,0.25)", border: "1px solid rgba(234,179,8,0.4)" }} />
            <span className="text-[10px] text-gray-600">≥ 50 min (challenge)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.3)" }} />
            <span className="text-[10px] text-gray-600">Visited</span>
          </div>
        </div>
      </div>

      {/* Day list by week */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        {records.length === 0 ? (
          <div className="py-12 text-center text-gray-600 text-sm">No attendance recorded this month.</div>
        ) : weeks.map((weekStart, wi) => {
          const weekEnd  = endOfWeek(weekStart, { weekStartsOn: 1 });
          const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
            .filter((d) => d >= monthStart && d <= monthEnd);
          const weekRecords = weekDays.filter((d) => recordMap.has(format(d, "yyyy-MM-dd")));
          if (weekRecords.length === 0) return null;

          const weekMins = weekDays.reduce((s, d) => s + (recordMap.get(format(d, "yyyy-MM-dd"))?.durationMins ?? 0), 0);

          return (
            <div key={wi}>
              {/* Week header */}
              <div className="px-5 py-2 flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">
                  Week {wi + 1} · {weekRecords.length} visit{weekRecords.length !== 1 ? "s" : ""}
                </span>
                {weekMins > 0 && <span className="text-[9px] font-semibold text-gray-600">Σ {durationLabel(weekMins)}</span>}
              </div>

              {weekDays.map((day) => {
                const ds  = format(day, "yyyy-MM-dd");
                const rec = recordMap.get(ds);
                if (!rec) return null;
                const counts = (rec.durationMins ?? 0) >= MIN_CHALLENGE_MINS;
                const isToday = ds === todayStr;

                return (
                  <div key={ds} className="px-5 py-3.5 flex items-center gap-4"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: isToday ? "rgba(249,115,22,0.04)" : undefined,
                    }}>
                    {/* Day */}
                    <div className="w-12 flex-shrink-0">
                      <p className="text-sm font-bold text-white">{format(day, "d")}</p>
                      <p className="text-[10px] text-gray-600">{format(day, "EEE")}</p>
                    </div>

                    {/* Times */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-emerald-400">{fmtIST(rec.checkInTime)}</span>
                        {rec.checkOutTime && (
                          <>
                            <span className="text-gray-700 text-xs">→</span>
                            <span className="text-sm font-bold text-red-400">{fmtIST(rec.checkOutTime)}</span>
                          </>
                        )}
                        {!rec.checkOutTime && <span className="text-xs text-amber-400 italic">still in</span>}
                        {rec.autoCheckedOut && <span className="text-[10px] text-gray-600 italic">auto</span>}
                      </div>
                      {rec.durationMins !== null && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-bold" style={{ color: counts ? "#eab308" : "#6b7280" }}>
                            {durationLabel(rec.durationMins)}
                          </span>
                          {counts && <Trophy className="h-3 w-3 text-yellow-400" />}
                          {rec.remarks && <span className="text-[10px] text-gray-600 italic truncate">{rec.remarks}</span>}
                        </div>
                      )}
                    </div>

                    {/* Duration bar */}
                    {rec.durationMins !== null && rec.durationMins > 0 && (
                      <div className="w-16 flex-shrink-0">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (rec.durationMins / 120) * 100)}%`,
                              background: counts ? "#eab308" : "#22c55e",
                            }} />
                        </div>
                        <p className="text-[9px] text-gray-700 mt-0.5 text-right">
                          {Math.min(100, Math.round((rec.durationMins / 120) * 100))}%
                        </p>
                      </div>
                    )}

                    {/* Edit */}
                    {canEdit && (
                      <button onClick={() => setEditRecord(rec)}
                        className="flex-shrink-0 p-2 rounded-lg text-gray-700 hover:text-orange-400 transition-colors"
                        style={{ background: "rgba(255,255,255,0.04)" }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {editRecord && (
        <EditAttendanceDialog
          open={!!editRecord}
          onClose={() => { setEditRecord(null); router.refresh(); }}
          record={editRecord}
          member={{ fullName: member.fullName, memberId: member.memberId }}
        />
      )}
    </div>
  );
}
