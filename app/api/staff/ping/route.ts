import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, addDays } from "date-fns";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Rate limit: 20 PIN attempts per 10 min per IP, block 15 min on breach
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rl = checkRateLimit(`${ip}:staff-ping`, { maxAttempts: 20, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 });
  }

  const { pin } = await req.json();

  if (!pin || String(pin).length < 4) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { pin: String(pin) },
    select: { id: true, fullName: true, employeeId: true, role: true, isActive: true },
  });

  if (!employee || !employee.isActive) {
    return NextResponse.json({ error: "Invalid PIN or account inactive" }, { status: 401 });
  }

  const today = new Date();
  const attendance = await prisma.employeeAttendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: startOfDay(today) } },
    include: { shifts: { orderBy: { shiftIndex: "asc" } } },
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const past30 = subDays(todayStart, 30);
  const future30 = addDays(todayStart, 30);

  const memberSelect = {
    id: true, memberId: true, fullName: true, phone: true, expiryDate: true,
    memberships: {
      orderBy: { expiryDate: "desc" as const },
      take: 1,
      select: {
        package: { select: { name: true } },
        payment: { select: { soldBy: { select: { fullName: true } } } },
      },
    },
  };

  const [expiredRecently, expiringSoon] = await Promise.all([
    prisma.member.findMany({
      where: {
        status: { not: "PROSPECT" },
        NOT: { memberId: { startsWith: "IMP-" } },
        expiryDate: { gte: past30, lt: todayStart },
      },
      select: memberSelect,
      orderBy: { expiryDate: "desc" },
      take: 50,
    }),
    prisma.member.findMany({
      where: {
        status: "ACTIVE",
        NOT: { memberId: { startsWith: "IMP-" } },
        expiryDate: { gte: todayStart, lte: future30 },
      },
      select: memberSelect,
      orderBy: { expiryDate: "asc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    employee: {
      id: employee.id,
      fullName: employee.fullName,
      employeeId: employee.employeeId,
      role: employee.role,
    },
    todayAttendance: attendance
      ? {
          status: attendance.status,
          shifts: attendance.shifts.map((s) => ({
            checkInTime: s.checkInTime.toISOString(),
            checkOutTime: s.checkOutTime?.toISOString() ?? null,
          })),
        }
      : null,
    expiredRecently: expiredRecently.map(m => ({
      id: m.id, memberId: m.memberId, fullName: m.fullName, phone: m.phone,
      expiryDate: m.expiryDate?.toISOString() ?? null,
      packageName: m.memberships[0]?.package?.name ?? null,
      soldBy: m.memberships[0]?.payment?.soldBy?.fullName ?? null,
    })),
    expiringSoon: expiringSoon.map(m => ({
      id: m.id, memberId: m.memberId, fullName: m.fullName, phone: m.phone,
      expiryDate: m.expiryDate?.toISOString() ?? null,
      packageName: m.memberships[0]?.package?.name ?? null,
      soldBy: m.memberships[0]?.payment?.soldBy?.fullName ?? null,
    })),
  });
}
