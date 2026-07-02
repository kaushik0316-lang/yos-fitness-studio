import { prisma } from "@/lib/prisma";
import { EmployeeAttendanceStatus, SalaryType } from "@prisma/client";
import { getDaysInMonth, startOfMonth, endOfMonth } from "date-fns";

// Sum hours across all shift windows defined on an employee
function dailyShiftHours(shifts: unknown): number {
  if (!Array.isArray(shifts)) return 0;
  let total = 0;
  for (const s of shifts as { start?: string; end?: string }[]) {
    if (!s.start || !s.end) continue;
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    if (mins > 0) total += mins / 60;
  }
  return total;
}

export type PayrollInput = {
  employeeId: string;
  month: number; // 1-12
  year: number;
};

export type PayrollResult = {
  employeeId: string;
  employeeName: string;
  salaryType: SalaryType;
  month: number;
  year: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  weeklyOffs: number;
  leaveDays: number;
  paidLeaveDays: number;
  workingDays: number;
  requiredHours: number;
  actualHours: number;
  grossSalary: number;
  deductions: number;
  bonus: number;
  netSalary: number;
};

export async function calculatePayroll(input: PayrollInput): Promise<PayrollResult> {
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
  });

  if (!employee) throw new Error("Employee not found");

  const monthStart = startOfMonth(new Date(input.year, input.month - 1, 1));
  const monthEnd = endOfMonth(monthStart);

  const attendances = await prisma.employeeAttendance.findMany({
    where: {
      employeeId: input.employeeId,
      date: { gte: monthStart, lte: monthEnd },
    },
    include: { shifts: true },
  });

  // Build date → status map from explicit attendance records
  const recordedStatus = new Map<string, EmployeeAttendanceStatus>();
  for (const a of attendances) {
    const d = new Date(a.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    recordedStatus.set(key, a.status);
  }

  // Count statuses — unrecorded Sundays default to PRESENT
  let presentDays = 0, absentDays = 0, halfDays = 0, weeklyOffs = 0, leaveDays = 0, paidLeaveDays = 0;
  const totalCalendarDays = getDaysInMonth(monthStart);
  for (let d = 1; d <= totalCalendarDays; d++) {
    const date = new Date(input.year, input.month - 1, d);
    const key = `${input.year}-${String(input.month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const isSunday = date.getDay() === 0;
    const status = recordedStatus.get(key) ?? (isSunday ? EmployeeAttendanceStatus.PRESENT : null);
    if (!status) continue;
    switch (status) {
      case EmployeeAttendanceStatus.PRESENT:    presentDays++;    break;
      case EmployeeAttendanceStatus.ABSENT:     absentDays++;     break;
      case EmployeeAttendanceStatus.HALF_DAY:   halfDays++;       break;
      case EmployeeAttendanceStatus.WEEKLY_OFF: weeklyOffs++;     break;
      case EmployeeAttendanceStatus.LEAVE:      leaveDays++;      break;
      case EmployeeAttendanceStatus.PAID_LEAVE: paidLeaveDays++;  break;
    }
  }

  // Sum actual hours from completed shifts
  let actualHours = 0;
  for (const a of attendances) {
    for (const s of a.shifts) {
      if (s.checkInTime && s.checkOutTime) {
        actualHours += (new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime()) / 3600000;
      }
    }
  }
  actualHours = Math.round(actualHours * 100) / 100;

  // Sundays are full working days — use all calendar days as the base
  const workingDays = totalCalendarDays;

  const isTrainer = employee.role === "TRAINER";

  // Required hours = shift hours per day × ALL days in month (Sundays + holidays count)
  const hoursPerDay = dailyShiftHours(employee.shifts);
  const requiredHours = isTrainer && hoursPerDay > 0 ? hoursPerDay * totalCalendarDays : 0;

  let grossSalary = 0;
  let deductions = 0;

  if (isTrainer && requiredHours > 0) {
    // Pro-rata: pay = monthlySalary × min(1, actualHours / requiredHours)
    const monthlySalary = Number(employee.monthlySalary ?? 0);
    grossSalary = monthlySalary * Math.min(1, actualHours / requiredHours);
    deductions = 0;
  } else if (employee.salaryType === SalaryType.FIXED_MONTHLY) {
    const monthlySalary = Number(employee.monthlySalary ?? 0);
    grossSalary = monthlySalary;
    const perDay = workingDays > 0 ? monthlySalary / workingDays : 0;
    deductions += absentDays * perDay;
    deductions += halfDays * (perDay * 0.5);
    deductions += leaveDays * perDay;
  } else if (employee.salaryType === SalaryType.PER_DAY) {
    const perDay = Number(employee.perDaySalary ?? 0);
    grossSalary = (presentDays + paidLeaveDays) * perDay + halfDays * perDay * 0.5;
  }

  const netSalary = Math.max(0, grossSalary - deductions);

  return {
    employeeId: input.employeeId,
    employeeName: employee.fullName,
    salaryType: employee.salaryType,
    month: input.month,
    year: input.year,
    presentDays,
    absentDays,
    halfDays,
    weeklyOffs,
    leaveDays,
    paidLeaveDays,
    workingDays,
    requiredHours,
    actualHours,
    grossSalary: Math.round(grossSalary * 100) / 100,
    deductions:  Math.round(deductions  * 100) / 100,
    bonus: 0,
    netSalary: Math.round(netSalary * 100) / 100,
  };
}

export async function savePayroll(result: PayrollResult): Promise<void> {
  await prisma.payrollRecord.upsert({
    where: {
      employeeId_month_year: {
        employeeId: result.employeeId,
        month: result.month,
        year: result.year,
      },
    },
    create: {
      employeeId:    result.employeeId,
      month:         result.month,
      year:          result.year,
      presentDays:   result.presentDays,
      absentDays:    result.absentDays,
      halfDays:      result.halfDays,
      weeklyOffs:    result.weeklyOffs,
      leaveDays:     result.leaveDays,
      paidLeaveDays: result.paidLeaveDays,
      workingDays:   result.workingDays,
      requiredHours: result.requiredHours,
      actualHours:   result.actualHours,
      grossSalary:   result.grossSalary,
      deductions:    result.deductions,
      bonus:         result.bonus,
      netSalary:     result.netSalary,
    },
    update: {
      presentDays:   result.presentDays,
      absentDays:    result.absentDays,
      halfDays:      result.halfDays,
      weeklyOffs:    result.weeklyOffs,
      leaveDays:     result.leaveDays,
      paidLeaveDays: result.paidLeaveDays,
      workingDays:   result.workingDays,
      requiredHours: result.requiredHours,
      actualHours:   result.actualHours,
      grossSalary:   result.grossSalary,
      deductions:    result.deductions,
      bonus:         result.bonus,
      netSalary:     result.netSalary,
    },
  });
}

export async function generateMonthlyPayroll(month: number, year: number): Promise<PayrollResult[]> {
  const employees = await prisma.employee.findMany({ where: { isActive: true } });
  const results: PayrollResult[] = [];

  for (const emp of employees) {
    const result = await calculatePayroll({ employeeId: emp.id, month, year });
    await savePayroll(result);
    results.push(result);
  }

  return results;
}
