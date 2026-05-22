import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/** Return current time in IST */
function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/**
 * Given a checkInTime (UTC) and a shiftEndTime like "14:00" (IST),
 * return the UTC Date of that shift end on the same IST calendar day as checkIn.
 */
function shiftEndUTC(checkInTime: Date, shiftEndTime: string): Date {
  const [hh, mm] = shiftEndTime.split(":").map(Number);

  // Get IST calendar date of the check-in
  const checkInIST = new Date(checkInTime.getTime() + IST_OFFSET_MS);
  const year  = checkInIST.getUTCFullYear();
  const month = checkInIST.getUTCMonth();
  const day   = checkInIST.getUTCDate();

  // Build IST midnight for that day (as UTC)
  const istMidnightUTC = Date.UTC(year, month, day, 0, 0, 0) - IST_OFFSET_MS;

  return new Date(istMidnightUTC + (hh * 60 + mm) * 60 * 1000);
}

/**
 * Fallback for employees without shiftEndTime:
 *   check-in before 12:00 PM IST → treat as morning → end 12:00 PM IST
 *   check-in at/after 12:00 PM  → treat as evening → end 22:00 IST
 */
function fallbackShiftEnd(checkInTime: Date): string {
  const checkInIST = new Date(checkInTime.getTime() + IST_OFFSET_MS);
  const istHour = checkInIST.getUTCHours() + checkInIST.getUTCMinutes() / 60;
  return istHour < 12 ? "12:00" : "22:00";
}

/**
 * GET/POST /api/cron/auto-checkout
 *
 * Called by Vercel Cron every hour (06:00–17:00 UTC = 11:30 AM–10:30 PM IST).
 * Closes any open shift whose employee's scheduled shiftEndTime has passed.
 * Employees without shiftEndTime fall back to the original morning/evening rule.
 */
async function runAutoCheckout() {
  const now = new Date();

  // All open shifts with employee info
  const openShifts = await prisma.attendanceShift.findMany({
    where: { checkOutTime: null },
    include: {
      attendance: {
        include: {
          employee: { select: { id: true, fullName: true, employeeId: true, shiftEndTime: true } },
        },
      },
    },
  });

  const toClose = openShifts.filter((s) => {
    const endTimeStr =
      s.attendance.employee.shiftEndTime ?? fallbackShiftEnd(s.checkInTime);
    const expectedCheckout = shiftEndUTC(s.checkInTime, endTimeStr);

    // Only close if the expected checkout time has already passed
    return now >= expectedCheckout;
  });

  if (toClose.length === 0) {
    return { checkedOut: 0, employees: [], message: "No open shifts ready for auto-checkout" };
  }

  for (const s of toClose) {
    const endTimeStr =
      s.attendance.employee.shiftEndTime ?? fallbackShiftEnd(s.checkInTime);
    const checkOutTime = shiftEndUTC(s.checkInTime, endTimeStr);

    await prisma.attendanceShift.update({
      where: { id: s.id },
      data: { checkOutTime },
    });
  }

  // Ensure parent attendance rows are PRESENT
  const attendanceIds = [...new Set(toClose.map((s) => s.attendanceId))];
  await prisma.employeeAttendance.updateMany({
    where: { id: { in: attendanceIds }, status: "ABSENT" },
    data: { status: "PRESENT" },
  });

  const employees = toClose.map(
    (s) => `${s.attendance.employee.fullName} (${s.attendance.employee.shiftEndTime ?? "fallback"})`
  );

  return { checkedOut: toClose.length, employees };
}

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return secret === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runAutoCheckout();
  return NextResponse.json({ success: true, ...result });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runAutoCheckout();
  return NextResponse.json({ success: true, ...result });
}
