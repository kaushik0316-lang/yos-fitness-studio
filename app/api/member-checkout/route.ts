import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:member-checkout`, {
      maxAttempts: 15, windowMs: 10 * 60 * 1000, blockMs: 20 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { attendanceId } = await req.json() as { attendanceId: string };
    if (!attendanceId) {
      return NextResponse.json({ error: "Attendance ID is required." }, { status: 400 });
    }

    const record = await prisma.memberAttendance.findUnique({
      where: { id: attendanceId },
      select: { id: true, checkInTime: true, checkOutTime: true, member: { select: { fullName: true } } },
    });

    if (!record) {
      return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
    }
    if (record.checkOutTime) {
      return NextResponse.json({ error: "Already checked out." }, { status: 409 });
    }

    const now = new Date();
    const minsSinceCheckIn = (now.getTime() - record.checkInTime.getTime()) / 60000;
    if (minsSinceCheckIn < 10) {
      const wait = Math.ceil(10 - minsSinceCheckIn);
      return NextResponse.json(
        { error: `Too soon — please wait ${wait} more minute${wait === 1 ? "" : "s"} before checking out.` },
        { status: 400 }
      );
    }

    await prisma.memberAttendance.update({
      where: { id: attendanceId },
      data: { checkOutTime: now },
    });

    const timeStr = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
    });

    return NextResponse.json({ ok: true, fullName: record.member.fullName, time: timeStr });
  } catch (err) {
    console.error("[member-checkout]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
