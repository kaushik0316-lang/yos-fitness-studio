import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** IST calendar date for "today" (midnight IST as UTC Date) */
function todayIST(): Date {
  const now = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Parse a YYYY-MM-DD string into a UTC midnight Date.
 * Returns null if the string is invalid.
 */
function parseDateParam(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Sanity check — round-trip must match
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

function isAuthorized(req: NextRequest): boolean {
  const secret =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  return secret === process.env.CRON_SECRET;
}

/**
 * GET/POST /api/cron/mark-absent[?date=YYYY-MM-DD]
 *
 * Runs at 17:30 UTC (11:00 PM IST) — after the gym closes.
 * Creates an ABSENT record for every active employee who has no
 * attendance entry for the given date (defaults to today IST).
 *
 * Pass ?date=2026-05-22 to backfill a missed day.
 */
async function runMarkAbsent(targetDate: Date) {
  const [activeEmployees, existingOnDate] = await Promise.all([
    prisma.employee.findMany({ where: { isActive: true }, select: { id: true, fullName: true } }),
    prisma.employeeAttendance.findMany({ where: { date: targetDate }, select: { employeeId: true } }),
  ]);

  const presentIds = new Set(existingOnDate.map((r) => r.employeeId));
  const missing = activeEmployees.filter((e) => !presentIds.has(e.id));

  if (missing.length === 0) {
    return { markedAbsent: 0, date: targetDate.toISOString().slice(0, 10), message: "All employees already have a record for this date" };
  }

  await prisma.employeeAttendance.createMany({
    data: missing.map((e) => ({
      employeeId: e.id,
      date: targetDate,
      status: "ABSENT",
    })),
    skipDuplicates: true,
  });

  return {
    markedAbsent: missing.length,
    date: targetDate.toISOString().slice(0, 10),
    employees: missing.map((e) => e.fullName),
  };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateParam = req.nextUrl.searchParams.get("date");
  let targetDate: Date;

  if (dateParam) {
    const parsed = parseDateParam(dateParam);
    if (!parsed) return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
    targetDate = parsed;
  } else {
    targetDate = todayIST();
  }

  const result = await runMarkAbsent(targetDate);
  return NextResponse.json({ success: true, ...result });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateParam = req.nextUrl.searchParams.get("date");
  let targetDate: Date;

  if (dateParam) {
    const parsed = parseDateParam(dateParam);
    if (!parsed) return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
    targetDate = parsed;
  } else {
    targetDate = todayIST();
  }

  const result = await runMarkAbsent(targetDate);
  return NextResponse.json({ success: true, ...result });
}
