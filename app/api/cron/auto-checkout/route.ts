import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// IST offset in minutes
const IST_OFFSET = 5 * 60 + 30;

function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET * 60 * 1000);
}

function istHour(date: Date): number {
  return toIST(date).getUTCHours() + toIST(date).getUTCMinutes() / 60;
}

// Expected checkout time for a given shift type on the day of check-in (in IST)
function expectedCheckoutUTC(checkInTime: Date, shift: "morning" | "evening"): Date {
  const ist = toIST(checkInTime);
  // Get midnight IST of that day, then add hours
  const istMidnight = new Date(Date.UTC(
    ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 0, 0, 0
  ));
  // morning → 12:00 PM IST, evening → 9:30 PM IST
  const offsetMs = shift === "morning"
    ? (12 * 60) * 60 * 1000
    : (21 * 60 + 30) * 60 * 1000;
  // Convert back to UTC
  return new Date(istMidnight.getTime() + offsetMs - IST_OFFSET * 60 * 1000);
}

/**
 * POST /api/cron/auto-checkout?shift=morning|evening
 *
 * Called by Vercel Cron:
 *   - morning  → 06:30 UTC (12:00 PM IST) — checks out morning shift staff
 *   - evening  → 16:00 UTC (09:30 PM IST) — checks out evening shift staff
 *
 * Catches ALL open shifts of the correct type (not just today's),
 * so missed cron runs from previous days are also cleaned up.
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

  // Find ALL open shifts (no date filter) — catches missed days too
  const openShifts = await prisma.attendanceShift.findMany({
    where: { checkOutTime: null },
    include: {
      attendance: { include: { employee: { select: { fullName: true, employeeId: true } } } },
    },
  });

  // Filter to correct shift window AND only past expected checkout time
  const targetShifts = openShifts.filter((s) => {
    const h = istHour(s.checkInTime);
    const isCorrectShift = shift === "morning" ? h < 12 : h >= 12;
    if (!isCorrectShift) return false;
    // Only auto-checkout if the expected checkout time has already passed
    const expectedCheckout = expectedCheckoutUTC(s.checkInTime, shift);
    return now >= expectedCheckout;
  });

  if (targetShifts.length === 0) {
    return NextResponse.json({
      success: true,
      shift,
      checkedOut: 0,
      message: "No open shifts found for this window",
    });
  }

  // Set checkout to the expected time for each shift's day (not "now")
  // so historical missed checkouts get the right time, not today's time
  for (const s of targetShifts) {
    const checkOutTime = expectedCheckoutUTC(s.checkInTime, shift);
    await prisma.attendanceShift.update({
      where: { id: s.id },
      data: { checkOutTime },
    });
  }

  // Mark parent attendance records as PRESENT if still ABSENT
  const attendanceIds = Array.from(new Set(targetShifts.map((s) => s.attendanceId)));
  await prisma.employeeAttendance.updateMany({
    where: { id: { in: attendanceIds }, status: "ABSENT" },
    data: { status: "PRESENT" },
  });

  const names = targetShifts.map((s) => s.attendance.employee.fullName);

  return NextResponse.json({
    success: true,
    shift,
    checkedOut: targetShifts.length,
    employees: names,
  });
}
