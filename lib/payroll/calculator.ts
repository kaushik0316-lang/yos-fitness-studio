import { prisma } from "@/lib/prisma";
import { EmployeeAttendanceStatus, SalaryType } from "@prisma/client";
import { getDaysInMonth, startOfMonth, endOfMonth } from "date-fns";

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
  workingDays: number; // calendar days minus Sundays
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
  });

  // Count each status
  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let weeklyOffs = 0;
  let leaveDays = 0;
  let paidLeaveDays = 0;

  for (const a of attendances) {
    switch (a.status) {
      case EmployeeAttendanceStatus.PRESENT: presentDays++; break;
      case EmployeeAttendanceStatus.ABSENT: absentDays++; break;
      case EmployeeAttendanceStatus.HALF_DAY: halfDays++; break;
      case EmployeeAttendanceStatus.WEEKLY_OFF: weeklyOffs++; break;
      case EmployeeAttendanceStatus.LEAVE: leaveDays++; break;
      case EmployeeAttendanceStatus.PAID_LEAVE: paidLeaveDays++; break;
    }
  }

  // Calendar working days (all days minus expected Sundays)
  const totalCalendarDays = getDaysInMonth(monthStart);
  let sundaysInMonth = 0;
  for (let d = 1; d <= totalCalendarDays; d++) {
    const date = new Date(input.year, input.month - 1, d);
    if (date.getDay() === 0) sundaysInMonth++;
  }
  const workingDays = totalCalendarDays - sundaysInMonth;

  // Salary calculation
  let grossSalary = 0;
  let deductions = 0;

  if (employee.salaryType === SalaryType.FIXED_MONTHLY) {
    const monthlySalary = Number(employee.monthlySalary ?? 0);
    grossSalary = monthlySalary;

    // Per-day value for deductions
    const perDay = monthlySalary / workingDays;

    // Absent days = full deduction
    deductions += absentDays * perDay;

    // Half day = 50% deduction
    deductions += halfDays * (perDay * 0.5);

    // Leave = full deduction (unpaid leave)
    deductions += leaveDays * perDay;

    // Paid leave = no deduction
    // paidLeaveDays treated as present

  } else if (employee.salaryType === SalaryType.PER_DAY) {
    const perDay = Number(employee.perDaySalary ?? 0);
    // Earn only for present days + paid leave + half days at 0.5
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
    grossSalary: Math.round(grossSalary * 100) / 100,
    deductions: Math.round(deductions * 100) / 100,
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
      employeeId: result.employeeId,
      month: result.month,
      year: result.year,
      presentDays: result.presentDays,
      absentDays: result.absentDays,
      halfDays: result.halfDays,
      weeklyOffs: result.weeklyOffs,
      leaveDays: result.leaveDays,
      paidLeaveDays: result.paidLeaveDays,
      workingDays: result.workingDays,
      grossSalary: result.grossSalary,
      deductions: result.deductions,
      bonus: result.bonus,
      netSalary: result.netSalary,
    },
    update: {
      presentDays: result.presentDays,
      absentDays: result.absentDays,
      halfDays: result.halfDays,
      weeklyOffs: result.weeklyOffs,
      leaveDays: result.leaveDays,
      paidLeaveDays: result.paidLeaveDays,
      workingDays: result.workingDays,
      grossSalary: result.grossSalary,
      deductions: result.deductions,
      bonus: result.bonus,
      netSalary: result.netSalary,
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
