import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit: 15 attempts / 15 min per IP; block 15 min on breach ────
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:my-attendance`, { maxAttempts: 15, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { pin, month, year } = body as { pin: string; month: number; year: number };

    if (!pin) return NextResponse.json({ error: "PIN is required." }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { pin } });
    if (!employee) return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
    if (!employee.isActive) return NextResponse.json({ error: "Your account is inactive. Contact admin." }, { status: 403 });

    const m = month ?? (new Date().getMonth() + 1);
    const y = year ?? new Date().getFullYear();

    const monthStart = startOfMonth(new Date(y, m - 1, 1));
    const monthEnd   = endOfMonth(monthStart);

    const records = await prisma.employeeAttendance.findMany({
      where: { employeeId: employee.id, date: { gte: monthStart, lte: monthEnd } },
      include: { shifts: { orderBy: { shiftIndex: "asc" } } },
      orderBy: { date: "asc" },
    });

    const summary = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, WEEKLY_OFF: 0, LEAVE: 0, PAID_LEAVE: 0 };
    for (const r of records) {
      if (r.status in summary) summary[r.status as keyof typeof summary]++;
    }

    return NextResponse.json({
      employee: {
        fullName: employee.fullName,
        employeeId: employee.employeeId,
        role: employee.role,
        shifts: employee.shifts,
        shiftDays: employee.shiftDays,
      },
      month: m,
      year: y,
      summary,
      records: records.map((r) => ({
        date: r.date.toISOString().split("T")[0],
        status: r.status,
        shifts: r.shifts.map((s) => ({
          shiftIndex: s.shiftIndex,
          checkInTime: s.checkInTime.toISOString(),
          checkOutTime: s.checkOutTime?.toISOString() ?? null,
        })),
      })),
    });
  } catch (err) {
    console.error("[my-attendance]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
