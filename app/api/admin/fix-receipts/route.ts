import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-transfer-ranjani";

export async function POST(req: Request) {
  const body = await req.json();
  if (body.secret !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find Mano Ranjana Gowtham's latest payment
  const from = await prisma.member.findFirst({
    where: { fullName: { contains: "mano ranjana", mode: "insensitive" } },
    include: { payments: { orderBy: { date: "desc" }, take: 1 } },
  });

  // Find Ranjani Monogaran
  const to = await prisma.member.findFirst({
    where: { fullName: { contains: "ranjani mono", mode: "insensitive" } },
    select: { id: true, fullName: true, memberId: true },
  });

  if (!from) return NextResponse.json({ error: "Mano Ranjana Gowtham not found" }, { status: 404 });
  if (!to)   return NextResponse.json({ error: "Ranjani Monogaran not found" }, { status: 404 });

  const payment = from.payments[0];
  if (!payment) return NextResponse.json({ error: "No payment found for Mano Ranjana Gowtham" }, { status: 404 });

  // Get full payment with membership
  const fullPayment = await prisma.payment.findUnique({
    where: { id: payment.id },
    include: { membership: true },
  });

  await prisma.$transaction(async (tx) => {
    // Move payment to Ranjani
    await tx.payment.update({ where: { id: payment.id }, data: { memberId: to.id } });

    // Move linked membership
    if (fullPayment?.membership) {
      await tx.membership.update({
        where: { id: fullPayment.membership.id },
        data: { memberId: to.id },
      });
      // Activate Ranjani
      await tx.member.update({
        where: { id: to.id },
        data: {
          currentPackageId: fullPayment.membership.packageId,
          startDate: fullPayment.membership.startDate,
          expiryDate: fullPayment.membership.expiryDate,
          renewalDueDate: fullPayment.membership.expiryDate,
          status: "ACTIVE",
        },
      });
    }

    // Expire Mano Ranjana Gowtham
    await tx.member.update({
      where: { id: from.id },
      data: { currentPackageId: null, expiryDate: null, renewalDueDate: null, status: "EXPIRED" },
    });
  });

  return NextResponse.json({ ok: true, moved: { receipt: payment.id, from: from.fullName, to: to.fullName } });
}
