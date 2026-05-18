import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GYM_LAT = 13.0347589;
const GYM_LNG = 80.2713245;
const GEOFENCE_RADIUS_M = 250;

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
    const body = await req.json();
    const { pin, lat, lng } = body as { pin: string; lat: number; lng: number };

    if (!pin || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "PIN, latitude, and longitude are required." }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { pin } });
    if (!employee) return NextResponse.json({ error: "Invalid PIN. Please try again." }, { status: 401 });
    if (!employee.isActive) return NextResponse.json({ error: "Your account is inactive. Contact the admin." }, { status: 403 });

    const distance = haversineDistance(lat, lng, GYM_LAT, GYM_LNG);
    if (distance > GEOFENCE_RADIUS_M) {
      return NextResponse.json({ error: "You must be at the gym to mark attendance." }, { status: 403 });
    }

    const todayIST = getISTDate();
    const now = new Date();

    // Get or create the day's attendance record
    let attendance = await prisma.employeeAttendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: todayIST } },
      include: { shifts: { orderBy: { shiftIndex: "asc" } } },
    });

    if (!attendance) {
      attendance = await prisma.employeeAttendance.create({
        data: {
          employeeId: employee.id,
          date: todayIST,
          status: "PRESENT",
        },
        include: { shifts: true },
      });
    }

    // Find the latest open shift (checked in but not yet checked out)
    const openShift = [...attendance.shifts].reverse().find((s) => !s.checkOutTime);
    let action: "checkin" | "checkout";

    if (openShift) {
      // Check out of the open shift
      await prisma.attendanceShift.update({
        where: { id: openShift.id },
        data: { checkOutTime: now, checkOutLat: lat, checkOutLng: lng },
      });
      action = "checkout";
    } else {
      // Start a new shift
      const nextIndex = attendance.shifts.length + 1;
      await prisma.attendanceShift.create({
        data: {
          attendanceId: attendance.id,
          shiftIndex: nextIndex,
          checkInTime: now,
          checkInLat: lat,
          checkInLng: lng,
        },
      });
      // Ensure status is PRESENT (might have been manually changed)
      if (attendance.status !== "PRESENT") {
        await prisma.employeeAttendance.update({
          where: { id: attendance.id },
          data: { status: "PRESENT" },
        });
      }
      action = "checkin";
    }

    const timeStr = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const shiftNum = openShift ? openShift.shiftIndex : attendance.shifts.length + 1;
    const shiftLabel = attendance.shifts.length > 0 || action === "checkout"
      ? ` (Shift ${shiftNum})`
      : "";

    const message =
      action === "checkin"
        ? `Welcome, ${employee.fullName}! Checked in${shiftLabel} at ${timeStr}.`
        : `Goodbye, ${employee.fullName}! Checked out${shiftLabel} at ${timeStr}.`;

    return NextResponse.json({
      action,
      employee: { fullName: employee.fullName, employeeId: employee.employeeId },
      time: timeStr,
      shiftNumber: shiftNum,
      message,
    });
  } catch (error) {
    console.error("[checkin] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
