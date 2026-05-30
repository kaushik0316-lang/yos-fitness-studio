import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET  → preview: shows current vs new receipt numbers for all Studio receipts > 2680
// POST → action: { action: "renumber" } closes the gap | { action: "ranjani", ranjaniMemberId } fixes membership

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // All Studio receipts above 2680, ordered by current receipt number
  const payments = await prisma.payment.findMany({
    where: { company: "YOS_FITNESS_STUDIO", receiptNumber: { gt: 2680 } },
    select: {
      id: true,
      receiptNumber: true,
      date: true,
      amount: true,
      member: { select: { memberId: true, fullName: true } },
    },
    orderBy: { receiptNumber: "asc" },
  });

  const preview = payments.map((p, idx) => ({
    id: p.id,
    oldNumber: p.receiptNumber,
    newNumber: 2681 + idx,
    changed: p.receiptNumber !== 2681 + idx,
    member: p.member.fullName,
    memberId: p.member.memberId,
    date: p.date,
    amount: p.amount,
  }));

  const changedCount = preview.filter((p) => p.changed).length;

  // Mano Ranjani candidates
  const ranjaniCandidates = await prisma.member.findMany({
    where: { fullName: { contains: "ranjani", mode: "insensitive" } },
    select: { id: true, memberId: true, fullName: true, phone: true, status: true, expiryDate: true },
  });

  return NextResponse.json({ preview, total: payments.length, changedCount, ranjaniCandidates });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // ── Action: close the receipt number gap ──────────────────────────────────
  if (body.action === "renumber") {
    const payments = await prisma.payment.findMany({
      where: { company: "YOS_FITNESS_STUDIO", receiptNumber: { gt: 2680 } },
      select: { id: true, receiptNumber: true },
      orderBy: { receiptNumber: "asc" },
    });

    // Two-pass update to avoid unique constraint conflicts:
    // Pass 1: shift all numbers to a high temp range (100000+)
    // Pass 2: set the correct sequential numbers
    await prisma.$transaction(async (tx) => {
      // Pass 1: temp numbers
      for (let i = 0; i < payments.length; i++) {
        await tx.payment.update({
          where: { id: payments[i].id },
          data: { receiptNumber: 100000 + i },
        });
      }
      // Pass 2: final sequential numbers
      for (let i = 0; i < payments.length; i++) {
        await tx.payment.update({
          where: { id: payments[i].id },
          data: { receiptNumber: 2681 + i },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      message: `Renumbered ${payments.length} receipts. New range: 2681–${2680 + payments.length}`,
      newMax: 2680 + payments.length,
    });
  }

  // ── Action: fix Mano Ranjani membership ───────────────────────────────────
  if (body.action === "ranjani") {
    const { ranjaniMemberId } = body;
    if (!ranjaniMemberId)
      return NextResponse.json({ error: "ranjaniMemberId required" }, { status: 400 });

    // Find the member with active membership assigned to wrong member
    const wrongMember = await prisma.member.findFirst({
      where: { fullName: { contains: "mano ranjana", mode: "insensitive" } },
      include: { payments: { orderBy: { date: "desc" }, take: 1 } },
    });

    if (!wrongMember?.payments[0])
      return NextResponse.json({ error: "Could not find Mano Ranjana Gowtham or their payment" }, { status: 404 });

    const paymentId = wrongMember.payments[0].id;

    const res = await fetch(
      `${process.env.NEXTAUTH_URL ?? "https://yosfitnessstudio.in"}/api/admin/reassign-payment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
        body: JSON.stringify({ paymentId, newMemberId: ranjaniMemberId }),
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
