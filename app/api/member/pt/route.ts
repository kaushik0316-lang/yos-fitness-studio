import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { getActiveProvider } from "@/lib/messaging/provider";
import {
  computeSlots, getPtConfig, istToday, parseDay, releaseExpiredHolds, requestDeadline, slotKeyOf, ymd,
} from "@/lib/pt";
import { releaseUnpaidBooking } from "@/lib/ptRespond";

// Member portal: request a personal training session, then pay once the trainer has
// confirmed the slot is free. PIN-authenticated like the other portal routes.

const MAX_OPEN = 5;           // upcoming sessions, including requests in progress
const MIN_RESPONSE_MIN = 30;  // a request must leave at least this long for the trainer to answer

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:member-pt`, { maxAttempts: 40, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 });
    }

    const body = await req.json();
    const { pin, action } = body as { pin?: string; action?: "overview" | "request" | "cancel" };
    if (!pin || String(pin).length !== 4) return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });

    const member = await prisma.member.findUnique({
      where: { pin: String(pin) },
      select: { id: true, fullName: true, memberId: true, status: true },
    });
    if (!member) return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });

    const cfg = await getPtConfig();
    await releaseExpiredHolds();

    const mine = async () => {
      const now = new Date();
      const rows = await prisma.ptBooking.findMany({
        where: {
          memberId: member.id,
          OR: [
            { status: { in: ["REQUESTED", "PENDING_PAYMENT"] }, expiresAt: { gt: now } },
            { status: { in: ["CONFIRMED", "PAID_SLOT_LOST"] }, date: { gte: istToday() } },
            { status: "DECLINED", respondedAt: { gt: new Date(now.getTime() - 24 * 3600_000) } },
          ],
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        select: { id: true, status: true, date: true, startTime: true, durationMins: true, price: true, payUrl: true, expiresAt: true, trainer: { select: { fullName: true } } },
      });
      return rows.map((b) => ({
        id: b.id, status: b.status, date: ymd(b.date), time: b.startTime, durationMins: b.durationMins,
        price: b.price, payUrl: b.status === "PENDING_PAYMENT" ? b.payUrl : null,
        expiresAt: b.expiresAt?.toISOString() ?? null, trainer: b.trainer.fullName,
      }));
    };

    // Everyone can see their own bookings; only active members can request.
    const eligible = member.status === "ACTIVE" && cfg.enabled && cfg.price >= 1;

    if (action === "cancel") {
      await releaseUnpaidBooking(String(body.bookingId ?? ""), member.id);
      return NextResponse.json({ bookings: await mine() });
    }

    if (action !== "request") {
      const bookings = await mine();
      const busy = bookings.some((b) => b.status === "REQUESTED" || b.status === "PENDING_PAYMENT");
      const days = eligible && body.withSlots !== false && !busy ? await computeSlots(cfg) : [];
      return NextResponse.json({ eligible, price: cfg.price, durationMins: cfg.durationMins, bookings, days });
    }

    // ── request one session ───────────────────────────────────────────────────
    if (!eligible) {
      return NextResponse.json({ error: member.status !== "ACTIVE"
        ? "Personal training sessions are available to active members. Please renew your membership."
        : "Personal training booking isn't open right now." }, { status: 400 });
    }

    const { trainerId, date, time } = body as { trainerId?: string; date?: string; time?: string };
    if (!trainerId || !date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Choose a date, time and trainer." }, { status: 400 });
    }

    const open = await mine();
    if (open.some((b) => b.status === "REQUESTED" || b.status === "PENDING_PAYMENT")) {
      return NextResponse.json({ error: "You already have a session in progress. Finish or cancel it first.", bookings: open }, { status: 409 });
    }
    if (open.filter((b) => b.status === "CONFIRMED").length >= MAX_OPEN) {
      return NextResponse.json({ error: `You already have ${MAX_OPEN} upcoming sessions booked.` }, { status: 400 });
    }

    const days = await computeSlots(cfg);
    const stillFree = days.find((d) => d.date === date)?.slots.some((s) => s.trainerId === trainerId && s.time === time);
    if (!stillFree) return NextResponse.json({ error: "That slot was just taken. Please pick another." }, { status: 409 });

    const day = parseDay(date);
    const deadline = requestDeadline(day, time);
    if (deadline.getTime() - Date.now() < MIN_RESPONSE_MIN * 60_000) {
      return NextResponse.json({ error: "That session starts too soon for the trainer to confirm. Please pick a later slot." }, { status: 400 });
    }

    let booking;
    try {
      booking = await prisma.ptBooking.create({
        data: {
          memberId: member.id, trainerId, date: day, startTime: time, durationMins: cfg.durationMins, price: cfg.price,
          status: "REQUESTED", slotKey: slotKeyOf(trainerId, day, time), expiresAt: deadline,
        },
        include: { trainer: { select: { fullName: true } } },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json({ error: "That slot was just taken. Please pick another." }, { status: 409 });
      }
      throw e;
    }

    // Best-effort heads-up to the studio so the trainer can be asked
    const adminPhone = process.env.ADMIN_NOTIFY_PHONE ?? "919840690418";
    getActiveProvider().send({
      to: adminPhone.startsWith("+") ? adminPhone : `+${adminPhone}`,
      channel: "WHATSAPP",
      message: `🏋️ *New PT session request*\n*Member:* ${member.fullName} (${member.memberId})\n*Trainer:* ${booking.trainer.fullName}\n*When:* ${date} at ${time}\n\nAsk the trainer to confirm: PT Sessions in Yos Desk.`,
    }).catch((e) => console.error("[member/pt] studio notify failed:", e));

    return NextResponse.json({ ok: true, bookingId: booking.id });
  } catch (err) {
    console.error("[member/pt]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
