import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";
import { checkRateLimit } from "@/lib/rateLimit";

function getISTDate(): Date {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  istNow.setUTCHours(0, 0, 0, 0);
  return istNow;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:member-ping`, {
      maxAttempts: 20, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { pin } = await req.json();
    if (!pin || String(pin).length !== 4) {
      return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { pin: String(pin) },
      select: {
        id: true, memberId: true, fullName: true,
        status: true, expiryDate: true, lastAttendanceDate: true,
        currentPackage: { select: { name: true } },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Invalid PIN. Please try again." }, { status: 401 });
    }

    // Check today's attendance + lifetime visit count
    const todayIST = getISTDate();
    const [todayAttendance, totalVisits] = await Promise.all([
      prisma.memberAttendance.findUnique({
        where: { memberId_date: { memberId: member.id, date: todayIST } },
        select: { id: true, checkInTime: true, checkOutTime: true, autoCheckedOut: true },
      }),
      prisma.memberAttendance.count({ where: { memberId: member.id } }),
    ]);

    return NextResponse.json({
      member: {
        id:               member.id,
        memberId:         member.memberId,
        fullName:         member.fullName,
        status:           member.status,
        expiryDate:       member.expiryDate?.toISOString() ?? null,
        packageName:      member.currentPackage?.name ?? null,
        lastAttendanceDate: member.lastAttendanceDate?.toISOString() ?? null,
      },
      totalVisits,
      todayAttendanceId: todayAttendance?.id ?? null,
      todayCheckIn:      todayAttendance ? todayAttendance.checkInTime.toISOString() : null,
      todayCheckOut:     todayAttendance?.checkOutTime?.toISOString() ?? null,
      autoCheckedOut:    todayAttendance?.autoCheckedOut ?? false,
    });
  } catch (err) {
    console.error("[member/ping]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
