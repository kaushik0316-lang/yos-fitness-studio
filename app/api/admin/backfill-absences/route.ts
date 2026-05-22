import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toISTDate(date: Date): Date {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = toISTDate(new Date(Date.now() - 86400000));

  // Default: backfill from Jan 1 of current year to yesterday
  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const startDate = fromParam ? new Date(fromParam) : new Date(Date.UTC(yesterday.getUTCFullYear(), 0, 1));

  const activeEmployees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true },
  });

  // Build list of all days from startDate to yesterday (skip Sundays)
  const days: Date[] = [];
  const cursor = new Date(startDate);
  while (cursor <= yesterday) {
    const dayOfWeek = cursor.getUTCDay();
    if (dayOfWeek !== 0) days.push(new Date(cursor)); // skip Sunday
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Fetch all existing records in the range
  const existing = await prisma.employeeAttendance.findMany({
    where: { date: { gte: startDate, lte: yesterday } },
    select: { employeeId: true, date: true },
  });
  const existingSet = new Set(existing.map((r) => `${r.employeeId}__${r.date.toISOString().split("T")[0]}`));

  const toCreate: { employeeId: string; date: Date; status: string }[] = [];
  for (const emp of activeEmployees) {
    for (const day of days) {
      const key = `${emp.id}__${day.toISOString().split("T")[0]}`;
      if (!existingSet.has(key)) {
        toCreate.push({ employeeId: emp.id, date: day, status: "ABSENT" });
      }
    }
  }

  if (toCreate.length === 0) {
    return NextResponse.json({ success: true, created: 0, message: "Nothing to backfill" });
  }

  // Insert in batches of 500
  let created = 0;
  for (let i = 0; i < toCreate.length; i += 500) {
    const batch = toCreate.slice(i, i + 500);
    const result = await prisma.employeeAttendance.createMany({ data: batch as any, skipDuplicates: true });
    created += result.count;
  }

  return NextResponse.json({ success: true, created, employees: activeEmployees.length, days: days.length });
}
