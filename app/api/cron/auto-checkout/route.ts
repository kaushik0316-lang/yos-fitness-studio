import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

// IST offset in minutes
const IST_OFFSET = 5 * 60 + 30;

function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET * 60 * 1000);
}

function istHour(date: Date): number {
  return toIST(date).getUTCHours() + toIST(date).getUTCMinutes() / 60;
}

/**
 * POST /api/cron/auto-checkout?shift=morning|evening
 *
 * Called by Vercel Cron:
 *   - morning  → 06:30 UTC (12:00 PM IST) — checks out morning shift staff
 *   - evening  → 16:00 UTC (09:30 PM IST) — checks out evening shift staff
 *
 * Morning shift: checked in between 05:45 AM – 12:00 PM IST (hour < 12)
 * Evening shift: checked in between 12:00 PM – 09:30 PM IST (hour >= 12)
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shift = req.nextUrl.searchParams.get("shift") as "morning" | "evening" | null;
  if (!shift || !["morning", "evening"].includes(shift)) {
    return NextResponse.json({ error: "Missing ?shift=morning|evening" }, { status: 400 });
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Checkout time = now (the exact moment the cron fires)
  const checkOutTime = now;

  // Find all open shifts for today that belong to the correct half of the day
  const openShifts = await prisma.attendanceShift.findMany({
    where: {
      checkOutTime: null,
      checkInTime: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: {
      attendance: { include: { employee: { select: { fullName: true, employeeId: true } } } },
    },
  });

  // Filter by shift window using IST hour of check-in time
  const targetShifts = openShifts.filter((s) => {
    const h = istHour(s.checkInTime);
    return shift === "morning" ? h < 12 : h >= 12;
  });

  if (targetShifts.length === 0) {
    return NextResponse.json({
      success: true,
      shift,
      checkedOut: 0,
      message: "No open shifts found for this window",
    });
  }

  // Batch checkout
  const updated = await prisma.attendanceShift.updateMany({
    where: { id: { in: targetShifts.map((s) => s.id) } },
    data: { checkOutTime },
  });

  // Also mark parent attendance records as PRESENT (if they're still ABSENT somehow)
  const attendanceIds = Array.from(new Set(targetShifts.map((s) => s.attendanceId)));
  await prisma.employeeAttendance.updateMany({
    where: { id: { in: attendanceIds }, status: "ABSENT" },
    data: { status: "PRESENT" },
  });

  const names = targetShifts.map((s) => s.attendance.employee.fullName);

  return NextResponse.json({
    success: true,
    shift,
    checkedOut: updated.count,
    employees: names,
    checkOutTime: checkOutTime.toISOString(),
  });
}
