import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const GYM_LAT = 13.0347589;
const GYM_LNG = 80.2713245;
const GEOFENCE_RADIUS_M = 50;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

    const { attendanceId, session = 1, lat, lng } = await req.json() as { attendanceId: string; session?: number; lat?: number; lng?: number };

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "Location is required to check out." }, { status: 400 });
    }

    const distance = haversineDistance(lat, lng, GYM_LAT, GYM_LNG);
    if (distance > GEOFENCE_RADIUS_M) {
      return NextResponse.json({ error: "You must be at the gym to check out." }, { status: 403 });
    }
    if (!attendanceId) {
      return NextResponse.json({ error: "Attendance ID is required." }, { status: 400 });
    }

    const record = await prisma.memberAttendance.findUnique({
      where: { id: attendanceId },
      select: {
        id: true, checkInTime: true, checkOutTime: true,
        session2CheckInTime: true, session2CheckOutTime: true,
        member: { select: { fullName: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
    }

    const now = new Date();
    let checkInTime: Date;

    if (session === 2) {
      if (!record.session2CheckInTime) {
        return NextResponse.json({ error: "No second session found." }, { status: 404 });
      }
      if (record.session2CheckOutTime) {
        return NextResponse.json({ error: "Already checked out." }, { status: 409 });
      }
      checkInTime = record.session2CheckInTime;
      const mins = (now.getTime() - checkInTime.getTime()) / 60000;
      if (mins < 10) {
        const wait = Math.ceil(10 - mins);
        return NextResponse.json(
          { error: `Too soon — please wait ${wait} more minute${wait === 1 ? "" : "s"} before checking out.` },
          { status: 400 }
        );
      }
      await prisma.memberAttendance.update({
        where: { id: attendanceId },
        data: { session2CheckOutTime: now },
      });
    } else {
      if (record.checkOutTime) {
        return NextResponse.json({ error: "Already checked out." }, { status: 409 });
      }
      checkInTime = record.checkInTime;
      const mins = (now.getTime() - checkInTime.getTime()) / 60000;
      if (mins < 10) {
        const wait = Math.ceil(10 - mins);
        return NextResponse.json(
          { error: `Too soon — please wait ${wait} more minute${wait === 1 ? "" : "s"} before checking out.` },
          { status: 400 }
        );
      }
      await prisma.memberAttendance.update({
        where: { id: attendanceId },
        data: { checkOutTime: now },
      });
    }

    const timeStr = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
    });
    const durationMins = Math.round((now.getTime() - checkInTime.getTime()) / 60000);

    return NextResponse.json({ ok: true, fullName: record.member.fullName, time: timeStr, durationMins });
  } catch (err) {
    console.error("[member-checkout]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
