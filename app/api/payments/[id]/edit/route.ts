import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { memberName, date, amount, discount, pendingAmount, paymentMode,
            categoryLabel, periodLabel, startDate, expiryDate,
            notes, transactionRef } = body;

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      select: { memberId: true },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    if (memberName && memberName.trim()) {
      await prisma.member.update({
        where: { id: payment.memberId },
        data: { fullName: memberName.trim() },
      });
    }

    await prisma.payment.update({
      where: { id: params.id },
      data: {
        date:          date      ? new Date(date)      : undefined,
        amount:        amount    != null ? amount      : undefined,
        discount:      discount  != null ? discount    : undefined,
        pendingAmount: pendingAmount != null ? pendingAmount : undefined,
        paymentMode:   paymentMode  || undefined,
        categoryLabel: categoryLabel || undefined,
        periodLabel:   periodLabel   || undefined,
        startDate:     startDate  ? new Date(startDate)  : undefined,
        expiryDate:    expiryDate ? new Date(expiryDate) : undefined,
        notes:         notes         ?? undefined,
        transactionRef: transactionRef ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
