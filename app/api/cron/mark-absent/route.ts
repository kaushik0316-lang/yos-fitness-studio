import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** IST calendar date for "today" (midnight IST as UTC Date) */
function todayIST(): Date {
  const now = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isAuthorized(req: NextRequest): boolean {
  const secret =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  return secret === process.env.CRON_SECRET;
}

/**
 * GET/POST /api/cron/mark-absent
 *
 * Runs at 17:30 UTC (11:00 PM IST) — after the gym closes.
 * Creates an ABSENT record for every active employee who has no
 * attendance entry for today (IST).
 */
async function runMarkAbsent() {
  const today = todayIST();

  const [activeEmployees, existingToday] = await Promise.all([
    prisma.employee.findMany({ where: { isActive: true }, select: { id: true, fullName: true } }),
    prisma.employeeAttendance.findMany({ where: { date: today }, select: { employeeId: true } }),
  ]);

  const presentIds = new Set(existingToday.map((r) => r.employeeId));
  const missing = activeEmployees.filter((e) => !presentIds.has(e.id));

  if (missing.length === 0) {
    return { markedAbsent: 0, message: "All employees already have a record for today" };
  }

  await prisma.employeeAttendance.createMany({
    data: missing.map((e) => ({
      employeeId: e.id,
      date: today,
      status: "ABSENT",
    })),
    skipDuplicates: true,
  });

  return {
    markedAbsent: missing.length,
    employees: missing.map((e) => e.fullName),
  };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runMarkAbsent();
  return NextResponse.json({ success: true, ...result });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runMarkAbsent();
  return NextResponse.json({ success: true, ...result });
}
