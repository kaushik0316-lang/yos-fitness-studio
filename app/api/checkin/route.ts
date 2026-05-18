import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GYM_LAT = 13.0347589;
const GYM_LNG = 80.2713245;
const GEOFENCE_RADIUS_M = 250;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getISTDate(): Date {
  // Returns a Date representing today at midnight in IST for use as a @db.Date value
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
  const istNow = new Date(now.getTime() + istOffset);
  // Zero-out the time portion so Prisma stores just the date
  istNow.setUTCHours(0, 0, 0, 0);
  return istNow;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin, lat, lng } = body as { pin: string; lat: number; lng: number };

    if (!pin || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "PIN, latitude, and longitude are required." }, { status: 400 });
    }

    // Find employee by PIN
    const employee = await prisma.employee.findUnique({
      where: { pin },
    });

    if (!employee) {
      return NextResponse.json({ error: "Invalid PIN. Please try again." }, { status: 401 });
    }

    if (!employee.isActive) {
      return NextResponse.json({ error: "Your account is inactive. Contact the admin." }, { status: 403 });
    }

    // Validate location
    const distance = haversineDistance(lat, lng, GYM_LAT, GYM_LNG);
    if (distance > GEOFENCE_RADIUS_M) {
      return NextResponse.json(
        { error: "You must be at the gym to mark attendance." },
        { status: 403 }
      );
    }

    const todayIST = getISTDate();
    const now = new Date();

    // Check existing attendance record for today
    const existing = await prisma.employeeAttendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: todayIST } },
    });

    let action: "checkin" | "checkout";
    let record;

    if (!existing || !existing.checkInTime) {
      // No record or no check-in yet — create / update with check-in
      record = await prisma.employeeAttendance.upsert({
        where: { employeeId_date: { employeeId: employee.id, date: todayIST } },
        create: {
          employeeId: employee.id,
          date: todayIST,
          status: "PRESENT",
          checkInTime: now,
          checkInLat: lat,
          checkInLng: lng,
        },
        update: {
          status: "PRESENT",
          checkInTime: now,
          checkInLat: lat,
          checkInLng: lng,
        },
      });
      action = "checkin";
    } else if (existing.checkInTime && !existing.checkOutTime) {
      // Has check-in but no check-out — record check-out
      record = await prisma.employeeAttendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime: now,
          checkOutLat: lat,
          checkOutLng: lng,
        },
      });
      action = "checkout";
    } else {
      // Already has both
      return NextResponse.json(
        { error: "Already checked in and out for today." },
        { status: 409 }
      );
    }

    const timeStr = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const message =
      action === "checkin"
        ? `Welcome, ${employee.fullName}! Checked in at ${timeStr}.`
        : `Goodbye, ${employee.fullName}! Checked out at ${timeStr}.`;

    return NextResponse.json({
      action,
      employee: { fullName: employee.fullName, employeeId: employee.employeeId },
      time: timeStr,
      message,
    });
  } catch (error) {
    console.error("[checkin] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
