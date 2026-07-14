import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:member-payments`, {
      maxAttempts: 30, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { pin } = await req.json();
    if (!pin || String(pin).length !== 4) {
      return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { pin: String(pin) },
      select: { id: true, memberId: true, fullName: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
    }

    const payments = await prisma.payment.findMany({
      where: { memberId: member.id, isVoided: false },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        amount: true,
        discount: true,
        pendingAmount: true,
        paymentMode: true,
        splitPaymentMode: true,
        splitAmount: true,
        receiptNumber: true,
        notes: true,
        package: { select: { name: true } },
        membership: { select: { startDate: true, expiryDate: true } },
      },
    });

    return NextResponse.json({
      member: { memberId: member.memberId, fullName: member.fullName },
      payments,
    });
  } catch (err) {
    console.error("[member/payments]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
