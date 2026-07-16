import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { auth } from "@/lib/auth";

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
    const { pin } = body as { pin: string };

    if (!pin || String(pin).length !== 4) {
      return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });
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
      // If they haven't checked out yet, offer checkout
      if (!existing.checkOutTime) {
        return NextResponse.json(
          { checkoutPending: true, attendanceId: existing.id, checkedInAt: timeStr, fullName: member.fullName },
          { status: 200 }
        );
      }
      const outStr = existing.checkOutTime.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
      });
      return NextResponse.json(
        { error: `Already checked in at ${timeStr} and checked out at ${outStr}.` },
        { status: 409 }
      );
    }

    // Kiosk self check-in — no session, markedById stays null
    const session = await auth().catch(() => null);
    const markedById = session?.user?.id ?? null;

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
