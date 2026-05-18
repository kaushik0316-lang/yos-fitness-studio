import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

// ── Per-device cooldown: prevent proxy check-ins ──────────────────────────────
// After a check-in, the same device must wait 2 minutes before a DIFFERENT
// employee can check in from it. Same employee re-entry (check-out) is always allowed.
const DEVICE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

interface DeviceEntry { employeeId: string; at: number }
const deviceMap = new Map<string, DeviceEntry>();

function checkDeviceCooldown(deviceId: string, employeeId: string): { allowed: boolean; waitSeconds?: number } {
  const entry = deviceMap.get(deviceId);
  if (!entry) return { allowed: true };
  const elapsed = Date.now() - entry.at;
  // Same employee checking in again (i.e. checkout) → always allow
  if (entry.employeeId === employeeId) return { allowed: true };
  // Different employee within cooldown window → block
  if (elapsed < DEVICE_COOLDOWN_MS) {
    return { allowed: false, waitSeconds: Math.ceil((DEVICE_COOLDOWN_MS - elapsed) / 1000) };
  }
  return { allowed: true };
}

function recordDeviceCheckin(deviceId: string, employeeId: string) {
  deviceMap.set(deviceId, { employeeId, at: Date.now() });
}

const GYM_LAT = 13.0347589;
const GYM_LNG = 80.2713245;
const GEOFENCE_RADIUS_M = 250;

// Gym operating hours: 5:30 AM – 10:30 PM IST
const OPEN_MINUTES  = 5 * 60 + 30;   // 330
const CLOSE_MINUTES = 22 * 60 + 30;  // 1350

function isWithinOperatingHours(): boolean {
  const now = new Date();
  // Convert UTC → IST (UTC+5:30)
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const totalMinutes = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
  return totalMinutes >= OPEN_MINUTES && totalMinutes <= CLOSE_MINUTES;
}

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
    // ── Rate limit: 10 attempts / 15 min per IP; block 30 min on breach ────
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:checkin`, { maxAttempts: 10, windowMs: 15 * 60 * 1000, blockMs: 30 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    // ── Operating hours check ───────────────────────────────────────────────
    if (!isWithinOperatingHours()) {
      return NextResponse.json(
        { error: "Check-in is only available between 5:30 AM and 10:30 PM." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { pin, lat, lng, deviceId } = body as { pin: string; lat: number; lng: number; deviceId?: string };

    if (!pin || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "PIN, latitude, and longitude are required." }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { pin } });
    if (!employee) return NextResponse.json({ error: "Invalid PIN. Please try again." }, { status: 401 });
    if (!employee.isActive) return NextResponse.json({ error: "Your account is inactive. Contact the admin." }, { status: 403 });

    // ── Device cooldown: block proxy check-ins ────────────────────────────────
    if (deviceId) {
      const dc = checkDeviceCooldown(deviceId, employee.id);
      if (!dc.allowed) {
        const mins = Math.ceil((dc.waitSeconds ?? 120) / 60);
        return NextResponse.json(
          { error: `Another employee just checked in from this device. Please wait ${dc.waitSeconds} seconds (${mins} min) before checking in a different person.` },
          { status: 429 }
        );
      }
    }

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

    // Record device → employee mapping for cooldown enforcement
    if (deviceId) recordDeviceCheckin(deviceId, employee.id);

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
