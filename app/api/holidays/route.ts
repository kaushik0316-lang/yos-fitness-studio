import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

// GET /api/holidays?month=9&year=2026
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const month = parseInt(sp.get("month") ?? "0");
  const year  = parseInt(sp.get("year")  ?? "0");

  const where = month && year
    ? { date: { gte: startOfMonth(new Date(year, month - 1, 1)), lte: endOfMonth(new Date(year, month - 1, 1)) } }
    : {};

  const holidays = await prisma.gymHoliday.findMany({ where, orderBy: { date: "asc" } });
  // Return as { "2026-09-13": "Pongal", ... }
  const map: Record<string, string> = {};
  for (const h of holidays) {
    map[h.date.toISOString().split("T")[0]] = h.name;
  }
  return NextResponse.json(map);
}

// POST /api/holidays  { date: "2026-09-13", name: "Pongal" }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "ACCOUNTANT"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { date, name } = await req.json();
  if (!date || !name?.trim()) return NextResponse.json({ error: "date and name required" }, { status: 400 });

  const d = startOfDay(new Date(date));
  const holiday = await prisma.gymHoliday.upsert({
    where: { date: d },
    update: { name: name.trim() },
    create: { date: d, name: name.trim() },
  });
  return NextResponse.json({ date: holiday.date.toISOString().split("T")[0], name: holiday.name });
}

// DELETE /api/holidays  { date: "2026-09-13" }
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "ACCOUNTANT"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const d = startOfDay(new Date(date));
  await prisma.gymHoliday.deleteMany({ where: { date: d } });
  return NextResponse.json({ ok: true });
}
