import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** IST calendar date for "today" (midnight UTC for the IST date) */
function todayIST(): Date {
  const now = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Subtract N days from a UTC midnight Date */
function subtractDays(date: Date, n: number): Date {
  return new Date(date.getTime() - n * 24 * 60 * 60 * 1000);
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
 * Mark absent for a single date.
 * Skips Sundays unless force=true.
 * Returns a result summary for that date.
 */
async function markAbsentForDate(targetDate: Date, force = false) {
  const dayOfWeek = targetDate.getUTCDay(); // 0 = Sunday
  if (dayOfWeek === 0 && !force) {
    return { markedAbsent: 0, date: targetDate.toISOString().slice(0, 10), skipped: true };
  }

  // Never mark today absent before 8 PM IST (gym is still open)
  if (!force) {
    const nowIST = new Date(Date.now() + IST_OFFSET_MS);
    const todayDate = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()));
    const isToday = targetDate.getTime() === todayDate.getTime();
    if (isToday && nowIST.getUTCHours() < 20) {
      return { markedAbsent: 0, date: targetDate.toISOString().slice(0, 10), skipped: true, reason: "gym still open" };
    }
  }

  const [activeEmployees, existingOnDate] = await Promise.all([
    prisma.employee.findMany({ where: { isActive: true }, select: { id: true, fullName: true } }),
    prisma.employeeAttendance.findMany({ where: { date: targetDate }, select: { employeeId: true } }),
  ]);

  const presentIds = new Set(existingOnDate.map((r) => r.employeeId));
  const missing = activeEmployees.filter((e) => !presentIds.has(e.id));

  if (missing.length === 0) {
    return { markedAbsent: 0, date: targetDate.toISOString().slice(0, 10) };
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

/**
 * GET/POST /api/cron/mark-absent[?date=YYYY-MM-DD&force=true]
 *
 * Runs at 17:30 UTC (11:00 PM IST) — after the gym closes.
 *
 * When called without a date (normal cron run):
 *   → Marks today + backtracks up to 2 days to self-heal any missed runs.
 *   → Sundays are always skipped (gym open 8–11 AM, staff rotate, no blanket absent).
 *
 * When called with ?date=YYYY-MM-DD:
 *   → Marks only that specific date (manual backfill).
 *   → Add &force=true to run even on a Sunday.
 */
async function runMarkAbsent(targetDate: Date | null, force = false) {
  // Manual single-date backfill
  if (targetDate) {
    const result = await markAbsentForDate(targetDate, force);
    return result;
  }

  // Automatic cron run: process today + previous 2 days as catch-up
  const today = todayIST();
  const dates = [today, subtractDays(today, 1), subtractDays(today, 2)];

  const results = await Promise.all(dates.map((d) => markAbsentForDate(d)));

  const totalMarked = results.reduce((sum, r) => sum + r.markedAbsent, 0);
  const catchupDates = results.filter((r, i) => i > 0 && r.markedAbsent > 0);

  return {
    markedAbsent: totalMarked,
    today: results[0],
    ...(catchupDates.length > 0 && { catchup: catchupDates }),
  };
}

function resolveParams(req: NextRequest): { targetDate: Date | null; force: boolean } | { error: string } {
  const dateParam = req.nextUrl.searchParams.get("date");
  const force = req.nextUrl.searchParams.get("force") === "true";

  if (dateParam) {
    const parsed = parseDateParam(dateParam);
    if (!parsed) return { error: "Invalid date format. Use YYYY-MM-DD." };
    return { targetDate: parsed, force };
  }
  return { targetDate: null, force };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = resolveParams(req);
  if ("error" in params) return NextResponse.json({ error: params.error }, { status: 400 });
  const result = await runMarkAbsent(params.targetDate, params.force);
  return NextResponse.json({ success: true, ...result });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = resolveParams(req);
  if ("error" in params) return NextResponse.json({ error: params.error }, { status: 400 });
  const result = await runMarkAbsent(params.targetDate, params.force);
  return NextResponse.json({ success: true, ...result });
}
