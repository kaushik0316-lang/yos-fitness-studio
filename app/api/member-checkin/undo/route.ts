import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const UNDO_WINDOW_MS = 10 * 60 * 1000; // only the most recent action, within 10 minutes

function getISTDate(): Date {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  istNow.setUTCHours(0, 0, 0, 0);
  return istNow;
}

// POST /api/member-checkin/undo — "Not you?" on the check-in success screen.
// Reverses only the single most recent write (session 1 create, or session 2
// reopen) — never touches an earlier, already-completed session.
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:member-checkin-undo`, {
      maxAttempts: 15, windowMs: 10 * 60 * 1000, blockMs: 20 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
    }

    const { attendanceId, session } = (await req.json()) as { attendanceId?: string; session?: number };
    if (!attendanceId) {
      return NextResponse.json({ error: "attendanceId is required." }, { status: 400 });
    }

    const record = await prisma.memberAttendance.findUnique({ where: { id: attendanceId } });
    if (!record) {
      return NextResponse.json({ error: "Nothing to undo." }, { status: 404 });
    }

    const todayIST = getISTDate();
    if (record.date.getTime() !== todayIST.getTime()) {
      return NextResponse.json({ error: "Only today's check-in can be undone." }, { status: 403 });
    }

    const now = Date.now();

    if (session === 2) {
      if (!record.session2CheckInTime) {
        return NextResponse.json({ error: "Nothing to undo." }, { status: 400 });
      }
      if (now - record.session2CheckInTime.getTime() > UNDO_WINDOW_MS) {
        return NextResponse.json({ error: "This check-in is too old to undo. Ask staff for help." }, { status: 403 });
      }
      await prisma.memberAttendance.update({
        where: { id: attendanceId },
        data: { session2CheckInTime: null },
      });
      return NextResponse.json({ ok: true });
    }

    // Session 1 — only undoable while it's the sole thing recorded today (no checkout yet)
    if (record.checkOutTime) {
      return NextResponse.json({ error: "This check-in is too old to undo. Ask staff for help." }, { status: 403 });
    }
    if (now - record.checkInTime.getTime() > UNDO_WINDOW_MS) {
      return NextResponse.json({ error: "This check-in is too old to undo. Ask staff for help." }, { status: 403 });
    }

    const priorMostRecent = await prisma.memberAttendance.findFirst({
      where: { memberId: record.memberId, date: { lt: todayIST } },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    await prisma.$transaction([
      prisma.memberAttendance.delete({ where: { id: attendanceId } }),
      prisma.member.update({
        where: { id: record.memberId },
        data: { lastAttendanceDate: priorMostRecent?.date ?? null },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[member-checkin/undo]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
