import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseDateParam(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/**
 * POST /api/admin/delete-absents?date=YYYY-MM-DD
 * Deletes all ABSENT employee attendance records for the given date.
 * Used to clean up incorrectly-created absence records (e.g. premature cron runs).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateParam = req.nextUrl.searchParams.get("date");
  if (!dateParam) return NextResponse.json({ error: "Missing ?date=YYYY-MM-DD" }, { status: 400 });

  const targetDate = parseDateParam(dateParam);
  if (!targetDate) return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });

  const result = await prisma.employeeAttendance.deleteMany({
    where: { date: targetDate, status: "ABSENT" },
  });

  return NextResponse.json({
    deleted: result.count,
    date: dateParam,
    message: `Removed ${result.count} absent record${result.count !== 1 ? "s" : ""} for ${dateParam}.`,
  });
}
