import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { auth } from "@/lib/auth";

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

function getISTDate(): Date {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  istNow.setUTCHours(0, 0, 0, 0);
  return istNow;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:member-checkin`, {
      maxAttempts: 15, windowMs: 10 * 60 * 1000, blockMs: 20 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { pin, lat, lng } = body as { pin: string; lat?: number; lng?: number };

    if (!pin || String(pin).length !== 4) {
      return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });
    }

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "Location is required to check in." }, { status: 400 });
    }

    const distance = haversineDistance(lat, lng, GYM_LAT, GYM_LNG);
    if (distance > GEOFENCE_RADIUS_M) {
      return NextResponse.json({ error: "You must be at the gym to check in." }, { status: 403 });
    }

    // Look up member by PIN
    const member = await prisma.member.findUnique({
      where: { pin: String(pin) },
      select: {
        id: true, memberId: true, fullName: true,
        status: true, expiryDate: true, allowKioskCheckin: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Invalid PIN. Please try again." }, { status: 401 });
    }

    // Block expired/inactive members unless admin has enabled kiosk override
    if ((member.status === "EXPIRED" || member.status === "INACTIVE") && !member.allowKioskCheckin) {
      return NextResponse.json(
        { error: "Your membership has expired. Please renew at the front desk." },
        { status: 403 }
      );
    }

    const todayIST  = getISTDate();
    const now       = new Date();

    // Check if already checked in today
    const existing = await prisma.memberAttendance.findUnique({
      where: { memberId_date: { memberId: member.id, date: todayIST } },
    });
    if (existing) {
      const timeStr = existing.checkInTime.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
      });

      // Session 1 still open — offer checkout
      if (!existing.checkOutTime) {
        return NextResponse.json(
          { checkoutPending: true, attendanceId: existing.id, checkedInAt: timeStr, fullName: member.fullName },
          { status: 200 }
        );
      }

      // Session 2 already open — offer checkout
      if (existing.session2CheckInTime && !existing.session2CheckOutTime) {
        const s2Str = existing.session2CheckInTime.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
        });
        return NextResponse.json(
          { checkoutPending: true, attendanceId: existing.id, checkedInAt: s2Str, fullName: member.fullName, session: 2 },
          { status: 200 }
        );
      }

      // Both sessions completed — no more check-ins today
      if (existing.session2CheckInTime && existing.session2CheckOutTime) {
        const s2InStr  = existing.session2CheckInTime.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
        });
        const s2OutStr = existing.session2CheckOutTime.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
        });
        return NextResponse.json(
          { error: `You've already completed two sessions today (last: ${s2InStr}–${s2OutStr}). See you tomorrow!` },
          { status: 409 }
        );
      }

      // Session 1 done, session 2 not started — begin second session
      await prisma.memberAttendance.update({
        where: { id: existing.id },
        data: { session2CheckInTime: now },
      });

      const s2TimeStr = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
      });
      return NextResponse.json({
        ok:       true,
        fullName: member.fullName,
        memberId: member.memberId,
        time:     s2TimeStr,
        session:  2,
        message:  `Welcome back, ${member.fullName}! Session 2 started at ${s2TimeStr}.`,
      });
    }

    // Resolve markedById — use system user (first ADMIN) since this is a kiosk (no session)
    const session = await auth().catch(() => null);
    let markedById = session?.user?.id ?? null;

    if (!markedById) {
      const admin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      markedById = admin?.id ?? null;
    }

    if (!markedById) {
      return NextResponse.json({ error: "System configuration error. Contact admin." }, { status: 500 });
    }

    // Mark attendance + update lastAttendanceDate
    await prisma.$transaction([
      prisma.memberAttendance.create({
        data: {
          memberId:    member.id,
          date:        todayIST,
          checkInTime: now,
          markedById,
        },
      }),
      prisma.member.update({
        where: { id: member.id },
        data:  { lastAttendanceDate: todayIST },
      }),
    ]);

    const timeStr = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
    });

    return NextResponse.json({
      ok:       true,
      fullName: member.fullName,
      memberId: member.memberId,
      time:     timeStr,
      message:  `Welcome, ${member.fullName}! Checked in at ${timeStr}.`,
    });
  } catch (err) {
    console.error("[member-checkin]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
