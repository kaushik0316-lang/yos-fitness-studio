import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const rl = checkRateLimit(`${ip}:member-checkout-pin`, {
      maxAttempts: 15, windowMs: 10 * 60 * 1000, blockMs: 20 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { pin } = await req.json() as { pin: string };
    if (!pin || String(pin).length !== 4) {
      return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { pin: String(pin) },
      select: { id: true, fullName: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Invalid PIN. Please try again." }, { status: 401 });
    }

    const todayIST = getISTDate();
    const record   = await prisma.memberAttendance.findUnique({
      where: { memberId_date: { memberId: member.id, date: todayIST } },
      select: { id: true, checkInTime: true, checkOutTime: true },
    });

    if (!record) {
      return NextResponse.json({ error: "You haven't checked in today." }, { status: 404 });
    }

    if (record.checkOutTime) {
      const outStr = record.checkOutTime.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
      });
      return NextResponse.json({ error: `Already checked out at ${outStr}.` }, { status: 409 });
    }

    const now = new Date();
    await prisma.memberAttendance.update({
      where: { id: record.id },
      data: { checkOutTime: now },
    });

    const checkInStr = record.checkInTime.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
    });
    const checkOutStr = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
    });

    return NextResponse.json({
      ok: true,
      fullName: member.fullName,
      checkInTime: checkInStr,
      checkOutTime: checkOutStr,
    });
  } catch (err) {
    console.error("[member-checkout-by-pin]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
