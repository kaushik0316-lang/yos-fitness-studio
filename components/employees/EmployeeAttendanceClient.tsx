"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Save, CalendarDays, Users, Clock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markEmployeeAttendance } from "@/lib/actions/attendance";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { StaffTab } from "./StaffTab";
import { ManualAttendanceDialog } from "./ManualAttendanceDialog";
import type { UserRole } from "@prisma/client";

type Shift = { id: string; shiftIndex: number; checkInTime: string; checkOutTime: string | null; deviceId: string | null };
type DayRecord = { status: string; shifts: Shift[] };

type Employee = {
  id: string; employeeId: string; fullName: string; role: string;
  phone: string; salaryType: string; monthlySalary: number | null;
  perDaySalary: number | null; pin: string | null; notes: string | null;
  isActive: boolean; joinDate: Date;
};

const STATUS_OPTIONS = [
  { value: "PRESENT",    label: "P",  color: "bg-green-500 text-white",   title: "Present" },
  { value: "ABSENT",     label: "A",  color: "bg-red-500 text-white",     title: "Absent" },
  { value: "HALF_DAY",   label: "H",  color: "bg-yellow-400 text-white",  title: "Half Day" },
  { value: "WEEKLY_OFF", label: "WO", color: "bg-gray-200 text-gray-600", title: "Weekly Off" },
  { value: "LEAVE",      label: "L",  color: "bg-blue-400 text-white",    title: "Leave" },
  { value: "PAID_LEAVE", label: "PL", color: "bg-indigo-400 text-white",  title: "Paid Leave" },
];

const STATUS_COLOR: Record<string, string> = {
  PRESENT: "bg-green-500 text-white", ABSENT: "bg-red-500 text-white",
  HALF_DAY: "bg-yellow-400 text-white", WEEKLY_OFF: "bg-gray-200 text-gray-600",
  LEAVE: "bg-blue-400 text-white", PAID_LEAVE: "bg-indigo-400 text-white",
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
    // Flatten to status-only for the grid
    const flat: Record<string, Record<string, string>> = {};
    for (const [empId, dates] of Object.entries(attendanceMap)) {
      flat[empId] = {};
      for (const [date, rec] of Object.entries(dates)) flat[empId][date] = rec.status;
    }
    return flat;
  });
  const [saving, setSaving] = useState(false);

  const canEdit = userRole === "ADMIN" || userRole === "ACCOUNTANT";
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd   = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  function prevMonth() { const d = new Date(year, month - 2, 1); router.push(`/employee-attendance?month=${d.getMonth() + 1}&year=${d.getFullYear()}`); }
  function nextMonth() { const d = new Date(year, month, 1);     router.push(`/employee-attendance?month=${d.getMonth() + 1}&year=${d.getFullYear()}`); }

  function cycleStatus(employeeId: string, dateStr: string) {
    if (!canEdit) return;
    const current = localMap[employeeId]?.[dateStr] ?? "";
    const idx = STATUS_OPTIONS.findIndex((s) => s.value === current);
    const next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length].value;
    setLocalMap((prev) => ({ ...prev, [employeeId]: { ...(prev[employeeId] ?? {}), [dateStr]: next } }));
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
    for (const [dateStr, s] of Object.entries(dates)) {
      if (new Date(dateStr).getDay() === 0) continue; // skip Sundays
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }

  // ── Detail drill-down (per-employee day list with shifts) ─────────────────

  if (detailEmp) {
    const empRecords = attendanceMap[detailEmp.id] ?? {};
    const totalDays = new Date(year, month, 0).getDate();
    const todayStr = new Date().toISOString().split("T")[0];
    const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear();

    // Build a map: deviceId → Set of employeeIds that used it this month
    // so we can flag shared-device check-ins
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
          <Button variant="outline" size="sm" onClick={() => setDetailEmp(null)}>← Back to Grid</Button>
          <div>
            <p className="font-bold text-gray-900">{detailEmp.fullName}</p>
            <p className="text-xs text-gray-500">{detailEmp.role.replace("_"," ")} · {format(new Date(year, month-1, 1), "MMMM yyyy")}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border divide-y divide-gray-100">
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
              <div key={dateStr} className={cn("px-4 py-3", isToday && "bg-orange-50/50")}>
                <div className="flex items-start gap-3">
                  {/* Date */}
                  <div className="w-10 flex-shrink-0 text-center pt-0.5">
                    <p className={cn("text-sm font-bold", isSunday ? "text-red-500" : "text-gray-800")}>{day}</p>
                    <p className={cn("text-[10px]", isSunday ? "text-red-400" : "text-gray-400")}>{dayName}</p>
                  </div>

                  {/* Status + shifts */}
                  <div className="flex-1 min-w-0">
                    {rec ? (
                      <>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold", STATUS_COLOR[rec.status])}>
                          {STATUS_OPTIONS.find((s) => s.value === rec.status)?.title ?? rec.status}
                        </span>
                        {rec.shifts.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {rec.shifts.map((s) => {
                              const sharedWith = s.deviceId
                                ? Array.from(deviceToEmployees[s.deviceId] ?? []).filter((id) => id !== detailEmp.id)
                                : [];
                              const sharedNames = sharedWith
                                .map((id) => allEmployees.find((e) => e.id === id)?.fullName ?? "Unknown")
                                .join(", ");
                              return (
                                <div key={s.shiftIndex} className="space-y-0.5">
                                  <div className="flex items-center gap-3 text-xs text-gray-600">
                                    {rec.shifts.length > 1 && (
                                      <span className="text-gray-400 w-12 flex-shrink-0 font-medium">Shift {s.shiftIndex}</span>
                                    )}
                                    <span className="text-green-600 font-medium">▲ {fmtTime(s.checkInTime)}</span>
                                    {s.checkOutTime
                                      ? <span className="text-red-500 font-medium">▼ {fmtTime(s.checkOutTime)}</span>
                                      : <span className="text-amber-500 italic text-xs">Still in</span>
                                    }
                                    {s.checkOutTime && (() => {
                                      const mins = (new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime()) / 60000;
                                      const h = Math.floor(mins / 60), m = Math.round(mins % 60);
                                      return <span className="text-gray-400">({h > 0 ? `${h}h ${m}m` : `${m}m`})</span>;
                                    })()}
                                  </div>
                                  {/* Device info row */}
                                  {s.deviceId && (
                                    <div className="flex items-center gap-1.5 pl-0.5">
                                      <span className="text-[10px] text-gray-400 font-mono">
                                        📱 Device ···{s.deviceId.slice(-6)}
                                      </span>
                                      {sharedWith.length > 0 && (
                                        <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">
                                          ⚠ also used by {sharedNames}
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
                      <span className="text-xs text-gray-400">{isFuture ? "" : isSunday ? "Sunday" : "Not marked"}</span>
                    )}
                  </div>

                  {/* Edit button — admins only, not future dates, not Sundays */}
                  {canEdit && !isFuture && !isSunday && (
                    <button
                      onClick={() => setEditDay({ dateStr, displayDate })}
                      title="Edit attendance"
                      className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Manual attendance edit dialog */}
        {editDay && detailEmp && (
          <ManualAttendanceDialog
            employeeId={detailEmp.id}
            employeeName={detailEmp.fullName}
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

  // ── Main view ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["attendance", "staff"] as const).map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t === "attendance" ? <CalendarDays className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {t === "attendance" ? "Attendance" : "Staff"}
            {t === "staff" && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", tab === "staff" ? "bg-orange-100 text-orange-700" : "bg-gray-200 text-gray-500")}>
                {allEmployees.filter(e => e.isActive).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Attendance grid ── */}
      {tab === "attendance" && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 border"><ChevronLeft className="h-4 w-4" /></button>
              <span className="font-semibold text-gray-900 min-w-[140px] text-center">{format(new Date(year, month - 1, 1), "MMMM yyyy")}</span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 border"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-xs">
                {STATUS_OPTIONS.map((s) => (
                  <span key={s.value} className={cn("px-2 py-0.5 rounded font-medium", s.color)}>{s.label}</span>
                ))}
              </div>
              {canEdit && (
                <Button size="sm" onClick={saveAll} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
              )}
            </div>
          </div>

          {canEdit && <p className="text-xs text-gray-500">Click a cell to cycle status · Click employee name for full detail</p>}

          {employees.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No active staff yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Go to the{" "}
                <button onClick={() => setTab("staff")} className="text-orange-500 hover:underline font-medium">Staff tab</button>{" "}
                to add your team.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="text-xs min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[160px]">Employee</th>
                    {days.map((day) => (
                      <th key={day.toISOString()} className={cn("px-1 py-2 font-medium text-center min-w-[80px]", day.getDay() === 0 ? "text-red-400" : "text-gray-500")}>
                        <div>{format(day, "d")}</div>
                        <div className="text-[10px] text-gray-400">{format(day, "EEE")}</div>
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold text-gray-600 text-center min-w-[140px]">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employees.map((emp) => {
                    const summary = getSummary(emp.id);
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 sticky left-0 bg-white">
                          <button onClick={() => setDetailEmp(emp)} className="text-left hover:text-orange-600 transition-colors group">
                            <p className="font-medium text-gray-900 group-hover:text-orange-600 flex items-center gap-1">
                              {emp.fullName}
                              <Clock className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            <p className="text-gray-400 font-normal text-[10px]">{emp.role.replace("_"," ")}</p>
                          </button>
                        </td>
                        {days.map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const status = localMap[emp.id]?.[dateStr] ?? "";
                          const shifts = attendanceMap[emp.id]?.[dateStr]?.shifts ?? [];
                          const isSunday = day.getDay() === 0;
                          const isFuture = day > new Date();
                          return (
                            <td key={dateStr} className="px-1 py-1 text-center align-top">
                              {/* Status badge — click to cycle */}
                              <button
                                onClick={() => !isFuture && !isSunday && cycleStatus(emp.id, dateStr)}
                                disabled={!canEdit || isFuture || isSunday}
                                title={isSunday ? "Sunday — not tracked" : STATUS_OPTIONS.find((s) => s.value === status)?.title ?? "Not marked"}
                                className={cn(
                                  "w-full rounded text-[10px] font-bold transition-colors px-1 py-0.5 mb-0.5",
                                  status ? STATUS_COLOR[status] : isSunday ? "bg-gray-100 text-gray-300" : "bg-gray-100 text-gray-400 hover:bg-gray-200",
                                  canEdit && !isFuture && "cursor-pointer"
                                )}
                              >
                                {status ? STATUS_OPTIONS.find((s) => s.value === status)?.label : (isSunday ? "—" : "")}
                              </button>
                              {/* Shift times */}
                              {shifts.length > 0 && (
                                <div className="space-y-1">
                                  {shifts.map((s) => (
                                    <div key={s.shiftIndex} className="text-left leading-tight">
                                      {shifts.length > 1 && (
                                        <div className="text-[9px] text-gray-400 font-medium">S{s.shiftIndex}</div>
                                      )}
                                      <div className="text-[10px] font-medium text-green-600">
                                        ▲ {fmtTime(s.checkInTime)}
                                      </div>
                                      {s.checkOutTime ? (
                                        <div className="text-[10px] font-medium text-red-500">
                                          ▼ {fmtTime(s.checkOutTime)}
                                        </div>
                                      ) : (
                                        <div className="text-[9px] text-amber-500 italic">in…</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 flex-wrap justify-center">
                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{summary.PRESENT}P</span>
                            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{summary.ABSENT}A</span>
                            <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{summary.HALF_DAY}H</span>
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{summary.LEAVE + summary.PAID_LEAVE}L</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Staff tab ── */}
      {tab === "staff" && <StaffTab employees={allEmployees} salesMap={salesMap} />}
    </div>
  );
}
