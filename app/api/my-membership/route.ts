import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:my-membership`, {
      maxAttempts: 15, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { pin, month, year } = body as { pin: string; month: number; year: number };

    if (!pin) return NextResponse.json({ error: "PIN is required." }, { status: 400 });

    const member = await prisma.member.findUnique({
      where: { pin: String(pin) },
      select: {
        id: true, memberId: true, fullName: true,
        status: true, expiryDate: true,
        currentPackage: { select: { name: true } },
      },
    });

    if (!member) return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });

    const m = month ?? (new Date().getMonth() + 1);
    const y = year  ?? new Date().getFullYear();

    const monthStart = startOfMonth(new Date(y, m - 1, 1));
    const monthEnd   = endOfMonth(monthStart);

    // Current month records
    const records = await prisma.memberAttendance.findMany({
      where: { memberId: member.id, date: { gte: monthStart, lte: monthEnd } },
      orderBy: { date: "asc" },
      select: { date: true, checkInTime: true },
    });

    // Streak: look back 60 days to span month boundaries
    const today = new Date();
    const lookback = new Date(today);
    lookback.setDate(today.getDate() - 60);

    const recentRecords = await prisma.memberAttendance.findMany({
      where: { memberId: member.id, date: { gte: lookback } },
      select: { date: true },
      orderBy: { date: "desc" },
    });

    const recentDates = new Set(recentRecords.map((r) => r.date.toISOString().split("T")[0]));
    let streak = 0;
    const cursor = new Date(today);
    // If not checked in today yet, start counting from yesterday
    if (!recentDates.has(cursor.toISOString().split("T")[0])) {
      cursor.setDate(cursor.getDate() - 1);
    }
    for (let i = 0; i < 60; i++) {
      if (!recentDates.has(cursor.toISOString().split("T")[0])) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const lastVisitDate = recentRecords.length > 0
      ? recentRecords[0].date.toISOString().split("T")[0]
      : null;

    return NextResponse.json({
      member: {
        memberId:    member.memberId,
        fullName:    member.fullName,
        status:      member.status,
        expiryDate:  member.expiryDate?.toISOString() ?? null,
        packageName: member.currentPackage?.name ?? null,
      },
      month: m,
      year:  y,
      daysAttended: records.length,
      streak,
      lastVisitDate,
      records: records.map((r) => ({
        date:        r.date.toISOString().split("T")[0],
        checkInTime: r.checkInTime.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[my-membership]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
