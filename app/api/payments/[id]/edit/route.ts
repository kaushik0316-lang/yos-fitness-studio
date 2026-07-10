import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Company, PaymentMode } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const editSchema = z.object({
  memberName: z.string().optional(),
  memberPhone: z.string().optional().nullable(),
  newMemberId: z.string().optional(),
  date: z.string().optional(),
  amount: z.number().positive().optional(),
  discount: z.number().nonnegative().optional(),
  pendingAmount: z.number().nonnegative().optional(),
  paymentMode: z.nativeEnum(PaymentMode).optional(),
  categoryLabel: z.string().optional(),
  periodLabel: z.string().optional(),
  startDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  transactionRef: z.string().optional().nullable(),
  company: z.nativeEnum(Company).optional(),
  soldById: z.string().nullable().optional(),
  soldById2: z.string().nullable().optional(),
  soldByPct: z.number().int().min(1).max(99).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = await req.json();
    const parsed = editSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input: " + parsed.error.errors[0]?.message }, { status: 400 });
    }
    const { memberName, memberPhone, newMemberId, date, amount, discount, pendingAmount, paymentMode,
            categoryLabel, periodLabel, startDate, expiryDate,
            notes, transactionRef, company, soldById, soldById2, soldByPct } = parsed.data;

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
      newReceiptNumber = ((maxReceipt._max?.receiptNumber) ?? 0) + 1;
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
        ...(soldById  !== undefined ? { soldById:  soldById  ?? null } : {}),
        ...(soldById2 !== undefined ? { soldById2: soldById2 ?? null } : {}),
        ...(soldByPct !== undefined ? { soldByPct } : {}),
      },
    });

    // ── Sync member denormalized fields from most recent payment ────────────
    const targetMemberId = newMemberId ?? payment.memberId;
    const latestPayment = await prisma.payment.findFirst({
      where: { memberId: targetMemberId, isVoided: false, expiryDate: { not: null } },
      orderBy: { date: "desc" },
      select: { id: true, expiryDate: true, startDate: true, packageId: true, date: true },
    });

    if (latestPayment?.expiryDate) {
      const now = new Date();
      const newStatus = latestPayment.expiryDate > now ? "ACTIVE" : "EXPIRED";
      await prisma.member.update({
        where: { id: targetMemberId },
        data: {
          expiryDate:       latestPayment.expiryDate,
          startDate:        latestPayment.startDate ?? undefined,
          currentPackageId: latestPayment.packageId ?? undefined,
          lastPaymentDate:  latestPayment.date,
          renewalDueDate:   latestPayment.expiryDate,
          status:           newStatus as any,
        },
      });
    }

    revalidatePath("/renewals");
    revalidatePath("/members");
    revalidatePath(`/members/${targetMemberId}`);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
