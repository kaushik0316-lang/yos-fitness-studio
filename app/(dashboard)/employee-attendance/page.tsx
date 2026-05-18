import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { EmployeeAttendanceClient } from "@/components/employees/EmployeeAttendanceClient";
import { startOfMonth, endOfMonth, format } from "date-fns";

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

  const [activeEmployees, allEmployees, attendances] = await Promise.all([
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" } }),
    prisma.employee.findMany({ orderBy: [{ isActive: "desc" }, { fullName: "asc" }] }),
    prisma.employeeAttendance.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      include: { shifts: { orderBy: { shiftIndex: "asc" } } },
      orderBy: { date: "asc" },
    }),
  ]);

  // Build lookup: employeeId → { "2026-05-01": { status, shifts[] } }
  const attendanceMap: Record<string, Record<string, { status: string; shifts: any[] }>> = {};
  for (const a of attendances) {
    if (!attendanceMap[a.employeeId]) attendanceMap[a.employeeId] = {};
    attendanceMap[a.employeeId][format(a.date, "yyyy-MM-dd")] = {
      status: a.status,
      shifts: a.shifts.map((s) => ({
        shiftIndex: s.shiftIndex,
        checkInTime: s.checkInTime.toISOString(),
        checkOutTime: s.checkOutTime?.toISOString() ?? null,
      })),
    };
  }

  return (
    <>
      <Header title="Employee Attendance" subtitle={format(monthStart, "MMMM yyyy")} />
      <div className="flex-1 p-6">
        <EmployeeAttendanceClient
          employees={activeEmployees as any}
          allEmployees={allEmployees as any}
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
