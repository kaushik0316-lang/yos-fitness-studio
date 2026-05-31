import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { memberName, memberPhone, newMemberId, date, amount, discount, pendingAmount, paymentMode,
            categoryLabel, periodLabel, startDate, expiryDate,
            notes, transactionRef, company } = body;

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      select: { memberId: true, company: true, receiptNumber: true },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    // If company is changing, assign next receipt number for the new company
    let newReceiptNumber: number | undefined;
    if (company && company !== payment.company) {
      const maxReceipt = await prisma.payment.aggregate({
        where: { company },
        _max: { receiptNumber: true },
      });
      newReceiptNumber = (maxReceipt._max.receiptNumber ?? 0) + 1;
    }

    if (newMemberId) {
      // Reassign payment to a different member
      await prisma.payment.update({
        where: { id: params.id },
        data: { memberId: newMemberId },
      });
    } else {
      // Update name and/or phone on the current member
      const memberUpdate: Record<string, string> = {};
      if (memberName && memberName.trim()) memberUpdate.fullName = memberName.trim();
      if (memberPhone !== undefined && memberPhone !== null) {
        const phone = String(memberPhone).trim();
        memberUpdate.phone = phone;
        memberUpdate.whatsapp = phone;
      }
      if (Object.keys(memberUpdate).length > 0) {
        await prisma.member.update({
          where: { id: payment.memberId },
          data: memberUpdate,
        });
      }
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
        company:        company           || undefined,
        receiptNumber:  newReceiptNumber  ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
