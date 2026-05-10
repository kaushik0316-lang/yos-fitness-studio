"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, getDaysInMonth, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markEmployeeAttendance } from "@/lib/actions/attendance";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

type Employee = { id: string; employeeId: string; fullName: string; role: string };

const STATUS_OPTIONS = [
  { value: "PRESENT",    label: "P",  color: "bg-green-500 text-white",   title: "Present" },
  { value: "ABSENT",     label: "A",  color: "bg-red-500 text-white",     title: "Absent" },
  { value: "HALF_DAY",   label: "H",  color: "bg-yellow-400 text-white",  title: "Half Day" },
  { value: "WEEKLY_OFF", label: "WO", color: "bg-gray-200 text-gray-600", title: "Weekly Off" },
  { value: "LEAVE",      label: "L",  color: "bg-blue-400 text-white",    title: "Leave" },
  { value: "PAID_LEAVE", label: "PL", color: "bg-indigo-400 text-white",  title: "Paid Leave" },
];

const STATUS_COLOR: Record<string, string> = {
  PRESENT:    "bg-green-500 text-white",
  ABSENT:     "bg-red-500 text-white",
  HALF_DAY:   "bg-yellow-400 text-white",
  WEEKLY_OFF: "bg-gray-200 text-gray-600",
  LEAVE:      "bg-blue-400 text-white",
  PAID_LEAVE: "bg-indigo-400 text-white",
};

type Props = {
  employees: Employee[];
  attendanceMap: Record<string, Record<string, string>>;
  month: number;
  year: number;
  userId: string;
  userRole: UserRole;
};

export function EmployeeAttendanceClient({ employees, attendanceMap, month, year, userId, userRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localMap, setLocalMap] = useState<Record<string, Record<string, string>>>(() => {
    // Deep copy so we can track edits locally
    return JSON.parse(JSON.stringify(attendanceMap));
  });
  const [saving, setSaving] = useState(false);

  const canEdit = userRole === "ADMIN" || userRole === "ACCOUNTANT";

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd   = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  function prevMonth() {
    const d = new Date(year, month - 2, 1);
    router.push(`/employee-attendance?month=${d.getMonth() + 1}&year=${d.getFullYear()}`);
  }
  function nextMonth() {
    const d = new Date(year, month, 1);
    router.push(`/employee-attendance?month=${d.getMonth() + 1}&year=${d.getFullYear()}`);
  }

  function cycleStatus(employeeId: string, dateStr: string) {
    if (!canEdit) return;
    const current = localMap[employeeId]?.[dateStr] ?? "";
    const idx = STATUS_OPTIONS.findIndex((s) => s.value === current);
    const next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length].value;
    setLocalMap((prev) => ({
      ...prev,
      [employeeId]: { ...(prev[employeeId] ?? {}), [dateStr]: next },
    }));
  }

  async function saveAll() {
    setSaving(true);
    let saved = 0;
    try {
      for (const [employeeId, dates] of Object.entries(localMap)) {
        for (const [dateStr, status] of Object.entries(dates)) {
          const original = attendanceMap[employeeId]?.[dateStr];
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
    } finally {
      setSaving(false);
    }
  }

  // Summary per employee
  function getSummary(empId: string) {
    const dates = localMap[empId] ?? {};
    const counts: Record<string, number> = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, WEEKLY_OFF: 0, LEAVE: 0, PAID_LEAVE: 0 };
    for (const s of Object.values(dates)) counts[s] = (counts[s] ?? 0) + 1;
    return counts;
  }

  return (
    <div className="space-y-4">
      {/* Month nav + legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 border">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-semibold text-gray-900 min-w-[140px] text-center">
            {format(new Date(year, month - 1, 1), "MMMM yyyy")}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 border">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            {STATUS_OPTIONS.map((s) => (
              <span key={s.value} className={cn("px-2 py-0.5 rounded font-medium", s.color)}>
                {s.label} = {s.title}
              </span>
            ))}
          </div>
          {canEdit && (
            <Button size="sm" onClick={saveAll} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {canEdit && (
        <p className="text-xs text-gray-500">Click a cell to cycle through: Present → Absent → Half Day → Weekly Off → Leave → Paid Leave</p>
      )}

      {/* Attendance grid */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="text-xs min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[140px]">Employee</th>
              {days.map((day) => (
                <th
                  key={day.toISOString()}
                  className={cn(
                    "px-1 py-2 font-medium text-center min-w-[28px]",
                    day.getDay() === 0 ? "text-red-400" : "text-gray-500"
                  )}
                >
                  <div>{format(day, "d")}</div>
                  <div className="text-gray-400">{format(day, "EEE")[0]}</div>
                </th>
              ))}
              <th className="px-3 py-2 font-semibold text-gray-600 text-center min-w-[160px]">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((emp) => {
              const summary = getSummary(emp.id);
              return (
                <tr key={emp.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 sticky left-0 bg-white font-medium text-gray-900">
                    <p>{emp.fullName}</p>
                    <p className="text-gray-400 font-normal">{emp.role.replace("_", " ")}</p>
                  </td>
                  {days.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const status = localMap[emp.id]?.[dateStr] ?? "";
                    const isSunday = day.getDay() === 0;
                    const isFuture = day > new Date();
                    return (
                      <td key={dateStr} className="px-0.5 py-1 text-center">
                        <button
                          onClick={() => !isFuture && cycleStatus(emp.id, dateStr)}
                          disabled={!canEdit || isFuture}
                          title={STATUS_OPTIONS.find((s) => s.value === status)?.title ?? "Not marked"}
                          className={cn(
                            "w-6 h-6 rounded text-[10px] font-bold transition-colors mx-auto block",
                            status ? STATUS_COLOR[status] : isSunday ? "bg-gray-100 text-gray-300" : "bg-gray-100 text-gray-400 hover:bg-gray-200",
                            canEdit && !isFuture && "cursor-pointer"
                          )}
                        >
                          {status ? STATUS_OPTIONS.find((s) => s.value === status)?.label : (isSunday ? "—" : "")}
                        </button>
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
    </div>
  );
}
