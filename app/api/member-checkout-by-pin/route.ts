import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const GYM_LAT = 13.0347589;
const GYM_LNG = 80.2713245;
const GEOFENCE_RADIUS_M = 50000; // TEMP: testing — revert to 50

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

    const { pin, lat, lng } = await req.json() as { pin: string; lat?: number; lng?: number };
    if (!pin || String(pin).length !== 4) {
      return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });
    }

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "Location is required to check out." }, { status: 400 });
    }

    const distance = haversineDistance(lat, lng, GYM_LAT, GYM_LNG);
    if (distance > GEOFENCE_RADIUS_M) {
      return NextResponse.json({ error: "You must be at the gym to check out." }, { status: 403 });
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
      select: { id: true, checkInTime: true, checkOutTime: true, session2CheckInTime: true, session2CheckOutTime: true },
    });

    if (!record) {
      return NextResponse.json({ error: "You haven't checked in today." }, { status: 404 });
    }

    const now = new Date();

    // Session 2 is open — check that out first
    if (record.session2CheckInTime && !record.session2CheckOutTime) {
      await prisma.memberAttendance.update({
        where: { id: record.id },
        data: { session2CheckOutTime: now },
      });

      const s2InStr  = record.session2CheckInTime.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
      });
      const s2OutStr = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
      });
      return NextResponse.json({
        ok: true,
        fullName: member.fullName,
        checkInTime: s2InStr,
        checkOutTime: s2OutStr,
        session: 2,
      });
    }

    // Session 1 open — check that out
    if (!record.checkOutTime) {
      await prisma.memberAttendance.update({
        where: { id: record.id },
        data: { checkOutTime: now },
      });

      const checkInStr  = record.checkInTime.toLocaleTimeString("en-IN", {
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
        session: 1,
      });
    }

    // Both sessions checked out
    return NextResponse.json({ error: "You've already checked out for today." }, { status: 409 });
  } catch (err) {
    console.error("[member-checkout-by-pin]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
