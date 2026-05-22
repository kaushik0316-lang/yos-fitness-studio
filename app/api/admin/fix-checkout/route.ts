import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Converts IST "HH:MM" on a given UTC date to a UTC Date object
function buildCheckoutUTC(checkInTime: Date, istTimeStr: string): Date {
  const [hh, mm] = istTimeStr.split(":").map(Number);
  const checkInIST = new Date(checkInTime.getTime() + IST_OFFSET_MS);
  const year  = checkInIST.getUTCFullYear();
  const month = checkInIST.getUTCMonth();
  const day   = checkInIST.getUTCDate();
  const istMidnightUTC = Date.UTC(year, month, day, 0, 0, 0) - IST_OFFSET_MS;
  return new Date(istMidnightUTC + (hh * 60 + mm) * 60 * 1000);
}

/**
 * PATCH /api/admin/fix-checkout
 * Body: { shiftId: string, checkoutIST: "HH:MM" }
 * OR:   { employeeId: string, dateStr: "YYYY-MM-DD", checkoutIST: "HH:MM" }
 */
export async function PATCH(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.shiftId) {
    const shift = await prisma.attendanceShift.findUnique({ where: { id: body.shiftId } });
    if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    const newCheckout = buildCheckoutUTC(shift.checkInTime, body.checkoutIST);
    await prisma.attendanceShift.update({ where: { id: body.shiftId }, data: { checkOutTime: newCheckout } });
    return NextResponse.json({ success: true, shiftId: body.shiftId, newCheckout });
  }

  if (body.employeeId && body.dateStr) {
    const dateStart = new Date(body.dateStr + "T00:00:00.000Z");
    const dateEnd   = new Date(body.dateStr + "T23:59:59.999Z");
    const attendance = await prisma.employeeAttendance.findFirst({
      where: { employeeId: body.employeeId, date: { gte: dateStart, lte: dateEnd } },
      include: { shifts: { orderBy: { shiftIndex: "asc" } } },
    });
    if (!attendance) return NextResponse.json({ error: "No attendance record found" }, { status: 404 });
    if (attendance.shifts.length === 0) return NextResponse.json({ error: "No shifts found for that day" }, { status: 404 });

    const shift = attendance.shifts[0];
    const newCheckout = buildCheckoutUTC(shift.checkInTime, body.checkoutIST);
    await prisma.attendanceShift.update({ where: { id: shift.id }, data: { checkOutTime: newCheckout } });
    return NextResponse.json({ success: true, shiftId: shift.id, newCheckout });
  }

  return NextResponse.json({ error: "Provide shiftId or (employeeId + dateStr)" }, { status: 400 });
}

/**
 * GET /api/admin/fix-checkout?employeeId=xxx&dateStr=2026-05-22
 * Lists open shifts for debugging
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");
  const dateStr = url.searchParams.get("dateStr");

  if (employeeId && dateStr) {
    const dateStart = new Date(dateStr + "T00:00:00.000Z");
    const dateEnd   = new Date(dateStr + "T23:59:59.999Z");
    const attendance = await prisma.employeeAttendance.findFirst({
      where: { employeeId, date: { gte: dateStart, lte: dateEnd } },
      include: {
        shifts: { orderBy: { shiftIndex: "asc" } },
        employee: { select: { id: true, fullName: true } },
      },
    });
    return NextResponse.json({ attendance });
  }

  // List all open shifts
  const openShifts = await prisma.attendanceShift.findMany({
    where: { checkOutTime: null },
    include: {
      attendance: {
        include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
      },
    },
    orderBy: { checkInTime: "asc" },
  });
  return NextResponse.json({ openShifts: openShifts.map(s => ({
    id: s.id,
    employee: s.attendance.employee.fullName,
    employeeId: s.attendance.employeeId,
    checkInTime: new Date(s.checkInTime.getTime() + IST_OFFSET_MS).toISOString().replace("T", " ").slice(0, 16) + " IST",
  }))});
}
