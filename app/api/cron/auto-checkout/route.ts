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


const MORNING_DEFAULT = "12:00";  // default morning shift end (noon)
const EVENING_DEFAULT = "21:30";  // default evening shift end (9:30 PM)

/**
 * Determine auto-checkout time (IST HH:MM) based purely on check-in window.
 *
 * Morning arrival (before noon):
 *   → use shiftEndTime if it is a morning time (hour < 12), else MORNING_DEFAULT
 * Evening arrival (noon or after):
 *   → use shiftEndTime if it is an evening time (hour >= 12), else EVENING_DEFAULT
 *
 * Examples:
 *   Morning person (shiftEndTime="12:00") checks in at 7 AM  → "12:00" ✓
 *   Morning person (shiftEndTime="12:00") checks in at 6 PM  → "21:30" ✓
 *   Evening person (shiftEndTime="21:30") checks in at 7 AM  → "12:00" ✓
 *   Evening person (shiftEndTime="21:30") checks in at 6 PM  → "21:30" ✓
 */
function resolveCheckoutTime(checkInTime: Date, shiftEndTime: string | null): string {
  const checkInIST = new Date(checkInTime.getTime() + IST_OFFSET_MS);
  const istHour = checkInIST.getUTCHours() + checkInIST.getUTCMinutes() / 60;
  const isMorning = istHour < 12;

  if (shiftEndTime) {
    const [h] = shiftEndTime.split(":").map(Number);
    const isShiftMorning = h < 12;
    // Only use shiftEndTime when it belongs to the same window as check-in
    if (isMorning && isShiftMorning) return shiftEndTime;
    if (!isMorning && !isShiftMorning) return shiftEndTime;
  }

  return isMorning ? MORNING_DEFAULT : EVENING_DEFAULT;
}

/**
 * GET/POST /api/cron/auto-checkout
 *
 * Closes any open shift whose auto-checkout time has passed.
 * Runs twice daily via Vercel Cron:
 *   08:30 UTC (2:00 PM IST) — catches morning-shift checkouts
 *   17:00 UTC (10:30 PM IST) — catches evening-shift checkouts
 */
async function runAutoCheckout() {
  const now = new Date();

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
    const endTimeStr = resolveCheckoutTime(s.checkInTime, s.attendance.employee.shiftEndTime);
    return now >= shiftEndUTC(s.checkInTime, endTimeStr);
  });

  if (toClose.length === 0) {
    return { checkedOut: 0, employees: [], message: "No open shifts ready for auto-checkout" };
  }

  for (const s of toClose) {
    const endTimeStr = resolveCheckoutTime(s.checkInTime, s.attendance.employee.shiftEndTime);
    await prisma.attendanceShift.update({
      where: { id: s.id },
      data: { checkOutTime: shiftEndUTC(s.checkInTime, endTimeStr) },
    });
  }

  const attendanceIds = Array.from(new Set(toClose.map((s) => s.attendanceId)));
  await prisma.employeeAttendance.updateMany({
    where: { id: { in: attendanceIds }, status: "ABSENT" },
    data: { status: "PRESENT" },
  });

  const employees = toClose.map((s) => {
    const end = resolveCheckoutTime(s.checkInTime, s.attendance.employee.shiftEndTime);
    return `${s.attendance.employee.fullName} → ${end}`;
  });

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
