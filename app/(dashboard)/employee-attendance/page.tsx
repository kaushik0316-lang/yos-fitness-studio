import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { EmployeeAttendanceClient } from "@/components/employees/EmployeeAttendanceClient";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format } from "date-fns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Employee Attendance" };

type SearchParams = { month?: string; year?: string };

export default async function EmployeeAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const today = new Date();
  const month = searchParams.month ? parseInt(searchParams.month) : today.getMonth() + 1;
  const year  = searchParams.year  ? parseInt(searchParams.year)  : today.getFullYear();

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd   = endOfMonth(monthStart);

  const [employees, attendances] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.employeeAttendance.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      orderBy: { date: "asc" },
    }),
  ]);

  // Build a lookup: employeeId → { "2026-04-01": status, ... }
  const attendanceMap: Record<string, Record<string, string>> = {};
  for (const a of attendances) {
    if (!attendanceMap[a.employeeId]) attendanceMap[a.employeeId] = {};
    attendanceMap[a.employeeId][format(a.date, "yyyy-MM-dd")] = a.status;
  }

  return (
    <>
      <Header title="Employee Attendance" subtitle={`${format(monthStart, "MMMM yyyy")}`} />
      <div className="flex-1 p-6">
        <EmployeeAttendanceClient
          employees={employees as any}
          attendanceMap={attendanceMap}
          month={month}
          year={year}
          userId={session!.user.id}
          userRole={session!.user.role}
        />
      </div>
    </>
  );
}
