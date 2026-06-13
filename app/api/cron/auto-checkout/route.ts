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


const MORNING_DEFAULT = "12:00";  // fallback morning shift end (noon)
const EVENING_DEFAULT = "21:30";  // fallback evening shift end (9:30 PM)
const SUNDAY_CLOSE    = "11:00";  // gym closes at 11 AM on Sundays

type ShiftDef = { start: string; end: string };

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Determine auto-checkout time (IST HH:MM) given check-in time and optional shifts array.
 *
 * If the employee has defined shifts (e.g. [{start:"07:00",end:"12:00"},{start:"16:00",end:"21:30"}]):
 *   → Find the shift whose start is closest to (and before) the check-in time.
 *     "Before" means within a 2-hour early window to handle early arrivals.
 *   → Use that shift's end time.
 *
 * Fallback (no shifts defined):
 *   → Morning check-in (before noon) → MORNING_DEFAULT
 *   → Evening check-in (noon or after) → EVENING_DEFAULT
 */
function resolveCheckoutTime(
  checkInTime: Date,
  shifts: ShiftDef[] | null,
  shiftEndTime: string | null,
): string {
  const checkInIST = new Date(checkInTime.getTime() + IST_OFFSET_MS);

  // Sunday: gym closes at 11 AM regardless of individual shift schedule
  if (checkInIST.getUTCDay() === 0) return SUNDAY_CLOSE;

  const checkInMinutes = checkInIST.getUTCHours() * 60 + checkInIST.getUTCMinutes();

  // ── Use shifts array if available ──────────────────────────────────────────
  if (shifts && shifts.length > 0) {
    // Find the best matching shift:
    // A shift matches if the employee checked in within 2 hours before the shift start,
    // or any time between shift start and shift end.
    let bestShift: ShiftDef | null = null;
    let bestDiff = Infinity;

    for (const s of shifts) {
      if (!s.start || !s.end) continue;
      const startMin = timeToMinutes(s.start);
      const endMin   = timeToMinutes(s.end);

      // Check-in is "in window" if it's within [start - 30 min, end]
      const windowStart = startMin - 30;
      if (checkInMinutes >= windowStart && checkInMinutes <= endMin) {
        const diff = Math.abs(checkInMinutes - startMin);
        if (diff < bestDiff) { bestDiff = diff; bestShift = s; }
      }
    }

    if (bestShift) return bestShift.end;

    // No shift matched window — pick the shift with the nearest start time
    let nearest: ShiftDef = shifts[0];
    let nearestDiff = Infinity;
    for (const s of shifts) {
      if (!s.start) continue;
      const diff = Math.abs(checkInMinutes - timeToMinutes(s.start));
      if (diff < nearestDiff) { nearestDiff = diff; nearest = s; }
    }
    return nearest.end || MORNING_DEFAULT;
  }

  // ── Legacy fallback: use shiftEndTime + check-in window ───────────────────
  const isMorning = checkInMinutes < 12 * 60;
  if (shiftEndTime) {
    const [h] = shiftEndTime.split(":").map(Number);
    const isShiftMorning = h < 12;
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
          employee: { select: { id: true, fullName: true, employeeId: true, shiftEndTime: true, shifts: true } },
        },
      },
    },
  });

  const toClose = openShifts.filter((s) => {
    const emp = s.attendance.employee;
    const endTimeStr = resolveCheckoutTime(s.checkInTime, emp.shifts as ShiftDef[] | null, emp.shiftEndTime);
    return now >= shiftEndUTC(s.checkInTime, endTimeStr);
  });

  if (toClose.length === 0) {
    return { checkedOut: 0, employees: [], message: "No open shifts ready for auto-checkout" };
  }

  const closed: string[] = [];
  const errors: string[] = [];

  // Process each shift independently — one failure won't block the others
  const MIN_SHIFT_MINUTES = 15;

  for (const s of toClose) {
    try {
      const emp = s.attendance.employee;
      const endTimeStr = resolveCheckoutTime(s.checkInTime, emp.shifts as ShiftDef[] | null, emp.shiftEndTime);
      const checkOutTime = shiftEndUTC(s.checkInTime, endTimeStr);

      const durationMins = (checkOutTime.getTime() - s.checkInTime.getTime()) / 60_000;

      if (durationMins < MIN_SHIFT_MINUTES) {
        // Too short — discard the shift entirely
        await prisma.attendanceShift.delete({ where: { id: s.id } });

        // Revert day status to ABSENT if no other shifts remain
        const remaining = await prisma.attendanceShift.count({ where: { attendanceId: s.attendanceId } });
        if (remaining === 0) {
          await prisma.employeeAttendance.update({
            where: { id: s.attendanceId },
            data: { status: "ABSENT" },
          });
        }

        closed.push(`${emp.fullName} → discarded (< ${MIN_SHIFT_MINUTES} min)`);
        continue;
      }

      await prisma.attendanceShift.update({
        where: { id: s.id },
        data: { checkOutTime },
      });

      await prisma.employeeAttendance.updateMany({
        where: { id: s.attendanceId, status: "ABSENT" },
        data: { status: "PRESENT" },
      });

      closed.push(`${emp.fullName} → ${endTimeStr}`);
    } catch (err: any) {
      errors.push(`shift ${s.id}: ${err?.message ?? String(err)}`);
    }
  }

  // ── MEMBER AUTO-CHECKOUT ─────────────────────────────────────────────────────
  // Any member checked in 3+ hours ago with no checkout → set checkOutTime to checkInTime + 30 min
  const THREE_HOURS_MS  = 3 * 60 * 60 * 1000;
  const THIRTY_MIN_MS   = 30 * 60 * 1000;
  const cutoff = new Date(now.getTime() - THREE_HOURS_MS);

  const openMemberCheckIns = await prisma.memberAttendance.findMany({
    where: { checkOutTime: null, checkInTime: { lte: cutoff } },
    select: { id: true, checkInTime: true, member: { select: { fullName: true, memberId: true } } },
  });

  const membersClosed: string[] = [];
  const memberErrors: string[] = [];

  for (const record of openMemberCheckIns) {
    try {
      const checkOutTime = new Date(record.checkInTime.getTime() + THIRTY_MIN_MS);
      await prisma.memberAttendance.update({
        where: { id: record.id },
        data: { checkOutTime, autoCheckedOut: true },
      });
      membersClosed.push(`${record.member.fullName} (${record.member.memberId})`);
    } catch (err: any) {
      memberErrors.push(`attendance ${record.id}: ${err?.message ?? String(err)}`);
    }
  }

  return {
    checkedOut: closed.length,
    employees: closed,
    membersAutoCheckedOut: membersClosed.length,
    members: membersClosed,
    ...(errors.length > 0 && { errors }),
    ...(memberErrors.length > 0 && { memberErrors }),
  };
}

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const secret = req.headers.get("x-cron-secret");
  return !!(cronSecret && secret && secret === cronSecret);
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
