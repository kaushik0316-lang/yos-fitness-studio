"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Save, CalendarDays, Users, Clock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markEmployeeAttendance } from "@/lib/actions/attendance";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import { StaffTab } from "./StaffTab";
import { ManualAttendanceDialog } from "./ManualAttendanceDialog";
import type { UserRole } from "@prisma/client";

type AttendanceShift = { id: string; shiftIndex: number; checkInTime: string; checkOutTime: string | null; deviceId: string | null };
type DayRecord = { status: string; shifts: AttendanceShift[] };

type EmployeeShiftDef = { start: string; end: string };
type Employee = {
  id: string; employeeId: string; fullName: string; role: string;
  phone: string; salaryType: string; monthlySalary: number | null;
  perDaySalary: number | null; pin: string | null; shiftEndTime: string | null;
  shifts: EmployeeShiftDef[] | null; notes: string | null; isActive: boolean; joinDate: Date;
};

const STATUS_OPTIONS = [
  { value: "PRESENT",    label: "P",  title: "Present" },
  { value: "ABSENT",     label: "A",  title: "Absent" },
  { value: "HALF_DAY",   label: "H",  title: "Half Day" },
  { value: "WEEKLY_OFF", label: "WO", title: "Weekly Off" },
  { value: "LEAVE",      label: "L",  title: "Leave" },
  { value: "PAID_LEAVE", label: "PL", title: "Paid Leave" },
];

// Dark-mode status colours
const STATUS_STYLE: Record<string, { cell: string; badge: string; dot: string }> = {
  PRESENT:    { cell: "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30", badge: "bg-emerald-500/15 text-emerald-400", dot: "bg-emerald-400" },
  ABSENT:     { cell: "bg-red-500/20 text-red-300 hover:bg-red-500/30",             badge: "bg-red-500/15 text-red-400",         dot: "bg-red-400" },
  HALF_DAY:   { cell: "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30",       badge: "bg-amber-500/15 text-amber-400",     dot: "bg-amber-400" },
  WEEKLY_OFF: { cell: "bg-white/5 text-gray-500 hover:bg-white/10",                 badge: "bg-white/5 text-gray-500",           dot: "bg-gray-500" },
  LEAVE:      { cell: "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30",          badge: "bg-blue-500/15 text-blue-400",       dot: "bg-blue-400" },
  PAID_LEAVE: { cell: "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30",    badge: "bg-purple-500/15 text-purple-400",   dot: "bg-purple-400" },
};

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

type Props = {
  employees: Employee[];
  allEmployees: Employee[];
  attendanceMap: Record<string, Record<string, DayRecord>>;
  salesMap: Record<string, number>;
  month: number; year: number;
  userId: string; userRole: UserRole;
};

export function EmployeeAttendanceClient({ employees, allEmployees, attendanceMap, salesMap, month, year, userId, userRole }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"attendance" | "staff">("attendance");
  const [detailEmp, setDetailEmp] = useState<Employee | null>(null);
  const [editDay, setEditDay] = useState<{ dateStr: string; displayDate: string } | null>(null);
  const [localMap, setLocalMap] = useState<Record<string, Record<string, string>>>(() => {
    const flat: Record<string, Record<string, string>> = {};
    for (const [empId, dates] of Object.entries(attendanceMap)) {
      flat[empId] = {};
      for (const [date, rec] of Object.entries(dates)) flat[empId][date] = rec.status;
    }
    return flat;
  });
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const canEdit = userRole === "ADMIN" || userRole === "ACCOUNTANT";
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd   = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  function prevMonth() { const d = new Date(year, month - 2, 1); router.push(`/employee-attendance?month=${d.getMonth() + 1}&year=${d.getFullYear()}`); }
  function nextMonth() { const d = new Date(year, month, 1);     router.push(`/employee-attendance?month=${d.getMonth() + 1}&year=${d.getFullYear()}`); }

  // For future dates: only cycle through leave-type statuses
  const FUTURE_OPTIONS = ["WEEKLY_OFF", "LEAVE", "PAID_LEAVE"];

  function cycleStatus(employeeId: string, dateStr: string, future = false) {
    if (!canEdit) return;
    const current = localMap[employeeId]?.[dateStr] ?? "";
    let next: string;
    if (future) {
      const idx = FUTURE_OPTIONS.indexOf(current);
      // Cycle: empty → WEEKLY_OFF → LEAVE → PAID_LEAVE → empty
      next = idx === -1 ? FUTURE_OPTIONS[0] : idx < FUTURE_OPTIONS.length - 1 ? FUTURE_OPTIONS[idx + 1] : "";
    } else {
      const idx = STATUS_OPTIONS.findIndex((s) => s.value === current);
      next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length].value;
    }
    setLocalMap((prev) => {
      const empDates = { ...(prev[employeeId] ?? {}), [dateStr]: next };
      if (!next) delete empDates[dateStr];
      return { ...prev, [employeeId]: empDates };
    });
  }

  async function saveAll() {
    setSaving(true); let saved = 0;
    try {
      for (const [employeeId, dates] of Object.entries(localMap)) {
        for (const [dateStr, status] of Object.entries(dates)) {
          const original = attendanceMap[employeeId]?.[dateStr]?.status;
          if (status !== original) {
            await markEmployeeAttendance({ employeeId, date: dateStr, status: status as any });
            saved++;
          }
        }
      }
      toast({ title: "Saved!", description: `${saved} records updated.` });
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  function getSummary(empId: string) {
    const dates = localMap[empId] ?? {};
    const c: Record<string, number> = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, WEEKLY_OFF: 0, LEAVE: 0, PAID_LEAVE: 0 };
    for (const [, s] of Object.entries(dates)) {
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }

  // ── Detail view ───────────────────────────────────────────────────────────
  if (detailEmp) {
    const empRecords = attendanceMap[detailEmp.id] ?? {};
    const totalDays = new Date(year, month, 0).getDate();
    const todayStr = new Date().toISOString().split("T")[0];
    const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear();

    const deviceToEmployees: Record<string, Set<string>> = {};
    for (const [empId, dates] of Object.entries(attendanceMap)) {
      for (const rec of Object.values(dates)) {
        for (const s of rec.shifts) {
          if (s.deviceId) {
            if (!deviceToEmployees[s.deviceId]) deviceToEmployees[s.deviceId] = new Set();
            deviceToEmployees[s.deviceId].add(empId);
          }
        }
      }
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDetailEmp(null)}
            className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div>
            <p className="font-bold text-white">{toTitleCase(detailEmp.fullName)}</p>
            <p className="text-xs text-gray-500">{detailEmp.role.replace("_"," ")} · {format(new Date(year, month-1, 1), "MMMM yyyy")}</p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          {Array.from({ length: totalDays }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const rec = empRecords[dateStr];
            const dayName = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(dateStr).getDay()];
            const isSunday = dayName === "Sun";
            const isToday = dateStr === todayStr;
            const isFuture = isCurrentMonth && day > new Date().getDate();
            const displayDate = format(new Date(dateStr), "EEE, d MMM");

            return (
              <div
                key={dateStr}
                className="px-5 py-3.5 flex items-start gap-4"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: isToday ? "rgba(249,115,22,0.06)" : isSunday ? "rgba(255,255,255,0.01)" : undefined,
                }}
              >
                <div className="w-10 flex-shrink-0 text-center">
                  <p className={cn("text-sm font-bold", isSunday ? "text-red-400" : isToday ? "text-orange-400" : "text-white")}>{day}</p>
                  <p className={cn("text-[10px]", isSunday ? "text-red-500/60" : "text-gray-600")}>{dayName}</p>
                </div>

                <div className="flex-1 min-w-0">
                  {rec ? (
                    <>
                      <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full font-bold", STATUS_STYLE[rec.status]?.cell ?? "bg-white/5 text-gray-400")}>
                        {STATUS_OPTIONS.find((s) => s.value === rec.status)?.title ?? rec.status}
                      </span>
                      {rec.shifts.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {rec.shifts.map((s) => {
                            const sharedWith = s.deviceId
                              ? Array.from(deviceToEmployees[s.deviceId] ?? []).filter((id) => id !== detailEmp.id)
                              : [];
                            const sharedNames = sharedWith.map((id) => toTitleCase(allEmployees.find((e) => e.id === id)?.fullName ?? "Unknown")).join(", ");
                            return (
                              <div key={s.shiftIndex} className="space-y-0.5">
                                <div className="flex items-center gap-3 text-xs">
                                  {rec.shifts.length > 1 && <span className="text-gray-600 w-12 font-medium">Shift {s.shiftIndex}</span>}
                                  <span className="text-emerald-400 font-semibold">▲ {fmtTime(s.checkInTime)}</span>
                                  {s.checkOutTime
                                    ? <span className="text-red-400 font-semibold">▼ {fmtTime(s.checkOutTime)}</span>
                                    : <span className="text-amber-400 italic text-xs">still in</span>
                                  }
                                  {s.checkOutTime && (() => {
                                    const mins = (new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime()) / 60000;
                                    const h = Math.floor(mins / 60), m = Math.round(mins % 60);
                                    return <span className="text-gray-600">({h > 0 ? `${h}h ${m}m` : `${m}m`})</span>;
                                  })()}
                                </div>
                                {s.deviceId && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-gray-700 font-mono">📱 ···{s.deviceId.slice(-6)}</span>
                                    {sharedWith.length > 0 && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                                        ⚠ also {sharedNames}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-700">{isFuture ? "" : isSunday ? "—" : "Not marked"}</span>
                  )}
                </div>

                {canEdit && !isFuture && (
                  <button
                    onClick={() => setEditDay({ dateStr, displayDate })}
                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-700 hover:text-orange-400 transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {editDay && detailEmp && (
          <ManualAttendanceDialog
            employeeId={detailEmp.id}
            employeeName={toTitleCase(detailEmp.fullName)}
            date={editDay.dateStr}
            displayDate={editDay.displayDate}
            currentStatus={(attendanceMap[detailEmp.id]?.[editDay.dateStr]?.status as any) ?? null}
            existingShifts={attendanceMap[detailEmp.id]?.[editDay.dateStr]?.shifts ?? []}
            isAdmin={userRole === "ADMIN"}
            onClose={() => { setEditDay(null); router.refresh(); }}
          />
        )}
      </div>
    );
  }

  // ── Main grid ─────────────────────────────────────────────────────────────
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear();

  const present    = employees.filter(e => localMap[e.id]?.[todayStr] === "PRESENT").length;
  const absent     = employees.filter(e => localMap[e.id]?.[todayStr] === "ABSENT").length;
  const halfDay    = employees.filter(e => localMap[e.id]?.[todayStr] === "HALF_DAY").length;
  const onLeave    = employees.filter(e => ["LEAVE", "PAID_LEAVE"].includes(localMap[e.id]?.[todayStr] ?? "")).length;
  const weeklyOff  = employees.filter(e => localMap[e.id]?.[todayStr] === "WEEKLY_OFF").length;
  const notMarked  = employees.filter(e => !localMap[e.id]?.[todayStr]).length;
  const stillIn    = employees.filter(e => (attendanceMap[e.id]?.[todayStr]?.shifts ?? []).some((s: any) => !s.checkOutTime)).length;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.05)" }}>
        {(["attendance", "staff"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === t ? "bg-orange-500 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {t === "attendance" ? <CalendarDays className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {t === "attendance" ? "Attendance" : "Staff Details"}
            {t === "staff" && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                tab === "staff" ? "bg-white/20 text-white" : "text-gray-600"
              )}>
                {allEmployees.filter(e => e.isActive).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "attendance" && (
        <>
          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Month nav */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl transition-colors text-gray-400 hover:text-white"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-bold text-white text-sm min-w-[130px] text-center">
                {format(new Date(year, month - 1, 1), "MMMM yyyy")}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl transition-colors text-gray-400 hover:text-white"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Legend */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATUS_OPTIONS.map((s) => (
                  <span key={s.value} className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_STYLE[s.value]?.badge)}>
                    {s.label}
                  </span>
                ))}
              </div>
              {canEdit && (
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Today summary bar */}
          {isCurrentMonth && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Today</span>
              {[
                { count: present,    label: "Present",     style: { background: "rgba(34,197,94,0.12)",  color: "#4ade80" } },
                { count: absent,     label: "Absent",      style: { background: "rgba(239,68,68,0.12)",  color: "#f87171" } },
                { count: halfDay,    label: "Half Day",    style: { background: "rgba(245,158,11,0.12)", color: "#fbbf24" } },
                { count: onLeave,    label: "On Leave",    style: { background: "rgba(59,130,246,0.12)", color: "#60a5fa" } },
                { count: weeklyOff,  label: "Weekly Off",  style: { background: "rgba(255,255,255,0.06)", color: "#6b7280" } },
                { count: notMarked,  label: "Not Marked",  style: { background: "rgba(255,255,255,0.06)", color: "#6b7280" } },
                { count: stillIn,    label: "Still In",    style: { background: "rgba(249,115,22,0.12)", color: "#fb923c" } },
              ].filter(x => x.count > 0).map(({ count, label, style }) => (
                <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={style}>
                  {label === "Still In" && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
                  {count} {label}
                </span>
              ))}
            </div>
          )}

          {canEdit && (
            <p className="text-[11px] text-gray-700">Click a cell to cycle status · Click future dates to plan leave · Click a name to see full shift detail</p>
          )}

          {employees.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Users className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No active staff yet</p>
              <button onClick={() => setTab("staff")} className="text-orange-400 hover:underline text-sm mt-1">Go to Staff tab →</button>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden overflow-x-auto" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
              <table className="text-xs min-w-full border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wider text-[10px] sticky left-0 z-10 min-w-[160px]"
                        style={{ background: "rgba(22,22,22,0.98)" }}>
                      Employee
                    </th>
                    <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-[10px] text-center min-w-[100px]"
                        style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
                      Month
                    </th>
                    {days.map((day) => {
                      const isToday = format(day, "yyyy-MM-dd") === todayStr;
                      const isSun   = day.getDay() === 0;
                      return (
                        <th key={day.toISOString()}
                          className="py-2 px-0.5 text-center min-w-[72px]"
                          style={{
                            borderLeft: "1px solid rgba(255,255,255,0.04)",
                            background: isToday ? "rgba(249,115,22,0.08)" : undefined,
                          }}>
                          <div className={cn("text-sm font-bold", isToday ? "text-orange-400" : isSun ? "text-red-500/60" : "text-gray-400")}>
                            {format(day, "d")}
                          </div>
                          <div className={cn("text-[9px] font-medium mt-0.5", isToday ? "text-orange-500/70" : isSun ? "text-red-500/40" : "text-gray-700")}>
                            {isToday ? "Today" : format(day, "EEE")}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => {
                    const summary = getSummary(emp.id);
                    return (
                      <tr key={emp.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                          className="group hover:bg-white/[0.02] transition-colors">
                        {/* Name — sticky */}
                        <td className="px-4 py-2.5 sticky left-0 z-10"
                            style={{ background: idx % 2 === 0 ? "#161616" : "#181818" }}>
                          <button onClick={() => setDetailEmp(emp)} className="text-left group/name">
                            <p className="font-bold text-white group-hover/name:text-orange-400 transition-colors flex items-center gap-1 text-[11px]">
                              {emp.fullName ? toTitleCase(emp.fullName) : <span className="text-gray-700 italic text-[10px]">No name</span>}
                              <Clock className="h-2.5 w-2.5 text-gray-600 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                            </p>
                            <p className="text-gray-700 text-[9px] font-medium mt-0.5">{emp.role.replace(/_/g," ")}</p>
                          </button>
                        </td>

                        {/* Summary */}
                        <td className="px-2 py-2 text-center" style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
                              {summary.PRESENT}P
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                              {summary.ABSENT}A
                            </span>
                            {summary.HALF_DAY > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24" }}>
                                {summary.HALF_DAY}H
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Day cells */}
                        {days.map((day) => {
                          const dateStr  = format(day, "yyyy-MM-dd");
                          const status   = localMap[emp.id]?.[dateStr] ?? "";
                          const shifts   = attendanceMap[emp.id]?.[dateStr]?.shifts ?? [];
                          const isSunday = day.getDay() === 0;
                          const isFuture = day > new Date();
                          const isToday  = dateStr === todayStr;
                          const style    = STATUS_STYLE[status];

                          return (
                            <td key={dateStr}
                              className="px-0.5 py-1.5 align-top text-center"
                              style={{
                                borderLeft: "1px solid rgba(255,255,255,0.04)",
                                background: isToday ? "rgba(249,115,22,0.05)" : isFuture ? "rgba(0,0,0,0.15)" : undefined,
                                opacity: isFuture && !status ? 0.35 : 1,
                              }}>
                              <button
                                onClick={() => cycleStatus(emp.id, dateStr, isFuture)}
                                disabled={!canEdit}
                                title={isFuture ? (status ? STATUS_OPTIONS.find(s => s.value === status)?.title : "Click to plan leave") : STATUS_OPTIONS.find(s => s.value === status)?.title ?? "Not marked"}
                                className={cn(
                                  "w-full rounded-md text-[10px] font-bold transition-all px-1 py-0.5 mb-0.5",
                                  status ? style?.cell : isFuture
                                    ? "text-gray-700 hover:bg-white/5 hover:text-gray-500 cursor-pointer"
                                    : "text-gray-800 hover:bg-white/5 hover:text-gray-600",
                                  canEdit && "cursor-pointer"
                                )}
                              >
                                {status
                                  ? STATUS_OPTIONS.find(s => s.value === status)?.label
                                  : ""}
                              </button>

                              {/* Shift times */}
                              {shifts.length > 0 && (
                                <div className="space-y-1 px-0.5">
                                  {shifts.map((s) => (
                                    <div key={s.shiftIndex} className="leading-tight">
                                      {shifts.length > 1 && (
                                        <div className="text-[8px] text-gray-700 font-semibold">S{s.shiftIndex}</div>
                                      )}
                                      <div className="text-[9px] font-semibold text-emerald-400">▲ {fmtTime(s.checkInTime)}</div>
                                      {s.checkOutTime
                                        ? <div className="text-[9px] font-semibold text-red-400">▼ {fmtTime(s.checkOutTime)}</div>
                                        : <div className="text-[8px] text-amber-400 italic">in…</div>
                                      }
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "staff" && <StaffTab employees={allEmployees} salesMap={salesMap} />}
    </div>
  );
}
