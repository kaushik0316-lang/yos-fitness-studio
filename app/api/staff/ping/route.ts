import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();

  if (!pin || String(pin).length < 4) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { pin: String(pin) },
    select: { id: true, fullName: true, employeeId: true, role: true, isActive: true },
  });

  if (!employee || !employee.isActive) {
    return NextResponse.json({ error: "Invalid PIN or account inactive" }, { status: 401 });
  }

  const today = new Date();
  const attendance = await prisma.employeeAttendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: startOfDay(today) } },
    include: { shifts: { orderBy: { shiftIndex: "asc" } } },
  });

  return NextResponse.json({
    employee: {
      id: employee.id,
      fullName: employee.fullName,
      employeeId: employee.employeeId,
      role: employee.role,
    },
    todayAttendance: attendance
      ? {
          status: attendance.status,
          shifts: attendance.shifts.map((s) => ({
            checkInTime: s.checkInTime.toISOString(),
            checkOutTime: s.checkOutTime?.toISOString() ?? null,
          })),
        }
      : null,
  });
}
