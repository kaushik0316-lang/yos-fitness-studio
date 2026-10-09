import { prisma } from "@/lib/prisma";
import { cancelRazorpayLink, createRazorpayPaymentLink, razorpayConfigured } from "@/lib/razorpay";
import {
  MIN_PAY_MINUTES, PAY_HOLD_EXTRA_MINUTES, PAY_WINDOW_HOURS, SESSION_BUFFER_MINUTES, slotInstant, ymd,
} from "@/lib/pt";

export type Responder = { name: string; trainerId?: string }; // trainerId set when the trainer answers for themselves

type Result = { ok: true; payUrl?: string } | { ok: false; error: string };

async function load(bookingId: string, by: Responder) {
  const b = await prisma.ptBooking.findUnique({
    where: { id: bookingId },
    include: { member: { select: { id: true, fullName: true, phone: true } }, trainer: { select: { fullName: true } } },
  });
  if (!b) return { ok: false as const, error: "Request not found." };
  if (by.trainerId && b.trainerId !== by.trainerId) return { ok: false as const, error: "This request is for another trainer." };
  if (b.status !== "REQUESTED") return { ok: false as const, error: "This request was already answered or has expired." };
  if (b.expiresAt && b.expiresAt < new Date()) {
    await prisma.ptBooking.update({ where: { id: b.id }, data: { status: "EXPIRED", slotKey: null } });
    return { ok: false as const, error: "This request has expired." };
  }
  return { ok: true as const, b };
}

// The trainer says the slot is free: create the payment link for the member.
export async function confirmPtRequest(bookingId: string, by: Responder): Promise<Result> {
  const got = await load(bookingId, by);
  if (!got.ok) return { ok: false, error: got.error };
  const { b } = got;

  if (!razorpayConfigured()) return { ok: false, error: "Online payments aren't set up, so a payment link can't be created." };

  const startMs = slotInstant(b.date, b.startTime).getTime();
  const deadlineMs = Math.min(Date.now() + PAY_WINDOW_HOURS * 3600_000, startMs - SESSION_BUFFER_MINUTES * 60_000);
  if (deadlineMs - Date.now() < MIN_PAY_MINUTES * 60_000) {
    await prisma.ptBooking.update({ where: { id: b.id }, data: { status: "EXPIRED", slotKey: null } });
    return { ok: false, error: "The session starts too soon to take payment. Ask the member to pick a later slot." };
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admin) return { ok: false, error: "No admin user found to own the payment." };

  const day = ymd(b.date);
  const link = await prisma.paymentLink.create({
    data: {
      memberId: b.memberId, createdById: admin.id, company: "YOS_FITNESS", amount: b.price,
      payload: {
        ptBookingId: b.id,
        bills: [{
          memberId: b.memberId, company: "YOS_FITNESS", paymentType: "ADMISSION",
          categoryLabel: "Personal Training", periodLabel: "1 Session",
          amount: b.price, discount: 0, pendingAmount: 0, startDate: day, expiryDate: day,
          notes: `PT session ${day} ${b.startTime} with ${b.trainer.fullName}`,
        }],
      },
    },
  });

  try {
    const digits = b.member.phone.replace(/\D/g, "").slice(-10);
    const realPhone = digits.length === 10 && !/^(\d)\1+$/.test(digits);
    const rz = await createRazorpayPaymentLink({
      amountPaise: b.price * 100,
      description: `Personal training session ${day} ${b.startTime} with ${b.trainer.fullName}`,
      referenceId: link.id,
      customerName: b.member.fullName,
      customerContact: realPhone ? digits : undefined,
      expireBy: Math.floor(deadlineMs / 1000),
      callbackPath: "/member-portal?pt=paid",
    });
    await prisma.paymentLink.update({ where: { id: link.id }, data: { razorpayLinkId: rz.id, shortUrl: rz.shortUrl } });

    // Claim the request only if it is still waiting (guards against a double click or two responders)
    const claimed = await prisma.ptBooking.updateMany({
      where: { id: b.id, status: "REQUESTED" },
      data: {
        status: "PENDING_PAYMENT", payUrl: rz.shortUrl, paymentLinkId: link.id,
        expiresAt: new Date(deadlineMs + PAY_HOLD_EXTRA_MINUTES * 60_000),
        respondedAt: new Date(), respondedByName: by.name,
      },
    });
    if (claimed.count === 0) {
      await cancelRazorpayLink(rz.id);
      await prisma.paymentLink.update({ where: { id: link.id }, data: { status: "CANCELLED" } });
      return { ok: false, error: "This request was already answered." };
    }
    return { ok: true, payUrl: rz.shortUrl };
  } catch (e) {
    console.error("[pt] could not create the payment link:", e);
    await prisma.paymentLink.update({ where: { id: link.id }, data: { status: "CANCELLED" } }).catch(() => {});
    return { ok: false, error: "Could not create the payment link. Please try again." };
  }
}

// The trainer says the slot is not free: release it.
export async function declinePtRequest(bookingId: string, by: Responder, note?: string): Promise<Result> {
  const got = await load(bookingId, by);
  if (!got.ok) return { ok: false, error: got.error };
  const done = await prisma.ptBooking.updateMany({
    where: { id: got.b.id, status: "REQUESTED" },
    data: { status: "DECLINED", slotKey: null, respondedAt: new Date(), respondedByName: by.name, staffNote: note?.trim().slice(0, 200) || null },
  });
  return done.count === 1 ? { ok: true } : { ok: false, error: "This request was already answered." };
}

// A member or staff member releases a booking that has not been paid yet.
export async function releaseUnpaidBooking(bookingId: string, memberId?: string): Promise<void> {
  const b = await prisma.ptBooking.findFirst({
    where: { id: bookingId, ...(memberId ? { memberId } : {}), status: { in: ["REQUESTED", "PENDING_PAYMENT"] } },
    select: { id: true, paymentLinkId: true },
  });
  if (!b) return;
  await prisma.ptBooking.update({ where: { id: b.id }, data: { status: "CANCELLED", slotKey: null } });
  if (b.paymentLinkId) {
    const link = await prisma.paymentLink.findUnique({ where: { id: b.paymentLinkId }, select: { id: true, razorpayLinkId: true, status: true } });
    if (link && link.status === "CREATED") {
      await prisma.paymentLink.update({ where: { id: link.id }, data: { status: "CANCELLED" } });
      if (link.razorpayLinkId) await cancelRazorpayLink(link.razorpayLinkId);
    }
  }
}
