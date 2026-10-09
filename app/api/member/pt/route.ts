import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { createRazorpayPaymentLink, razorpayConfigured } from "@/lib/razorpay";
import {
  HOLD_MINUTES, LINK_MINUTES, computeSlots, getPtConfig, istToday, parseDay, slotKeyOf, ymd, releaseExpiredHolds,
} from "@/lib/pt";

// Member portal: book and pay for personal training sessions, one session at a time.
// PIN-authenticated like the other portal routes.

const MAX_UPCOMING = 5;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:member-pt`, { maxAttempts: 40, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 });
    }

    const body = await req.json();
    const { pin, action } = body as { pin?: string; action?: "overview" | "book" | "cancel" };
    if (!pin || String(pin).length !== 4) return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });

    const member = await prisma.member.findUnique({
      where: { pin: String(pin) },
      select: { id: true, fullName: true, phone: true, status: true },
    });
    if (!member) return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });

    const cfg = await getPtConfig();
    await releaseExpiredHolds();

    const mine = async () => {
      const rows = await prisma.ptBooking.findMany({
        where: {
          memberId: member.id,
          OR: [
            { status: "PENDING_PAYMENT", expiresAt: { gt: new Date() } },
            { status: { in: ["CONFIRMED", "PAID_SLOT_LOST"] }, date: { gte: istToday() } },
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

    // Everyone can see their own bookings; only active members can book.
    const eligible = member.status === "ACTIVE" && cfg.enabled && cfg.price >= 1;

    if (action === "cancel") {
      // Only an unpaid hold can be released by the member
      await prisma.ptBooking.updateMany({
        where: { id: String(body.bookingId ?? ""), memberId: member.id, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", slotKey: null },
      });
      return NextResponse.json({ bookings: await mine() });
    }

    if (action !== "book") {
      const bookings = await mine();
      const hasPending = bookings.some((b) => b.status === "PENDING_PAYMENT");
      const days = eligible && body.withSlots !== false && !hasPending ? await computeSlots(cfg) : [];
      return NextResponse.json({
        eligible, price: cfg.price, durationMins: cfg.durationMins, bookings, days,
      });
    }

    // ── book one session ────────────────────────────────────────────────────────
    if (!eligible) {
      return NextResponse.json({ error: member.status !== "ACTIVE"
        ? "Personal training sessions are available to active members. Please renew your membership."
        : "Personal training booking isn't open right now." }, { status: 400 });
    }
    if (!razorpayConfigured()) return NextResponse.json({ error: "Online payments aren't available right now. Please contact the studio." }, { status: 503 });

    const { trainerId, date, time } = body as { trainerId?: string; date?: string; time?: string };
    if (!trainerId || !date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Choose a date, time and trainer." }, { status: 400 });
    }

    const open = await mine();
    const pending = open.find((b) => b.status === "PENDING_PAYMENT");
    if (pending?.payUrl) {
      return NextResponse.json({ error: "You have a slot waiting for payment. Finish paying for it or release it first.", bookings: open }, { status: 409 });
    }
    if (open.filter((b) => b.status === "CONFIRMED").length >= MAX_UPCOMING) {
      return NextResponse.json({ error: `You already have ${MAX_UPCOMING} upcoming sessions booked.` }, { status: 400 });
    }

    // The slot must still be on the free list
    const days = await computeSlots(cfg);
    const stillFree = days.find((d) => d.date === date)?.slots.some((s) => s.trainerId === trainerId && s.time === time);
    if (!stillFree) return NextResponse.json({ error: "That slot was just taken. Please pick another." }, { status: 409 });

    const day = parseDay(date);
    let booking;
    try {
      booking = await prisma.ptBooking.create({
        data: {
          memberId: member.id, trainerId, date: day, startTime: time, durationMins: cfg.durationMins, price: cfg.price,
          status: "PENDING_PAYMENT", slotKey: slotKeyOf(trainerId, day, time),
          expiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
        },
        include: { trainer: { select: { fullName: true } } },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json({ error: "That slot was just taken. Please pick another." }, { status: 409 });
      }
      throw e;
    }

    const release = (id: string) =>
      prisma.ptBooking.update({ where: { id }, data: { status: "CANCELLED", slotKey: null } });

    try {
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
      if (!admin) throw new Error("No admin user");

      const link = await prisma.paymentLink.create({
        data: {
          memberId: member.id, createdById: admin.id, company: "YOS_FITNESS", amount: cfg.price,
          payload: {
            ptBookingId: booking.id,
            bills: [{
              memberId: member.id, company: "YOS_FITNESS", paymentType: "ADMISSION",
              categoryLabel: "Personal Training", periodLabel: "1 Session",
              amount: cfg.price, discount: 0, pendingAmount: 0, startDate: date, expiryDate: date,
              notes: `PT session ${date} ${time} with ${booking.trainer.fullName}`,
            }],
          },
        },
      });

      const digits = member.phone.replace(/\D/g, "").slice(-10);
      const realPhone = digits.length === 10 && !/^(\d)\1+$/.test(digits);
      const rz = await createRazorpayPaymentLink({
        amountPaise: cfg.price * 100,
        description: `Personal training session ${date} ${time} with ${booking.trainer.fullName}`,
        referenceId: link.id,
        customerName: member.fullName,
        customerContact: realPhone ? digits : undefined,
        expireBy: Math.floor(Date.now() / 1000) + LINK_MINUTES * 60,
        callbackPath: "/member-portal?pt=paid",
      }).catch(async (e) => {
        await prisma.paymentLink.update({ where: { id: link.id }, data: { status: "CANCELLED" } });
        throw e;
      });

      await prisma.paymentLink.update({ where: { id: link.id }, data: { razorpayLinkId: rz.id, shortUrl: rz.shortUrl } });
      await prisma.ptBooking.update({ where: { id: booking.id }, data: { payUrl: rz.shortUrl, paymentLinkId: link.id } });
      return NextResponse.json({ ok: true, payUrl: rz.shortUrl, bookingId: booking.id });
    } catch (e) {
      console.error("[member/pt] could not create the payment link:", e);
      await release(booking.id);
      return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 502 });
    }
  } catch (err) {
    console.error("[member/pt]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
