"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Company, PaymentMode, PaymentType } from "@prisma/client";
import { z } from "zod";

const receiptSchema = z.object({
  memberId: z.string(),
  company: z.nativeEnum(Company),
  paymentType: z.nativeEnum(PaymentType),
  categoryLabel: z.string(),
  periodLabel: z.string(),
  amount: z.number().positive(),
  discount: z.number().default(0),
  pendingAmount: z.number().default(0),
  paymentMode: z.nativeEnum(PaymentMode),
  startDate: z.string(), // "YYYY-MM-DD"
  expiryDate: z.string(), // "YYYY-MM-DD"
  previousReceiptNo: z.number().optional(),
  previousAmount: z.number().optional(),
  notes: z.string().optional(),
});

export async function createReceipt(input: z.infer<typeof receiptSchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const { role } = session.user;
  if (role !== "ADMIN" && role !== "FRONT_DESK" && role !== "ACCOUNTANT") {
    throw new Error("Forbidden");
  }

  const data = receiptSchema.parse(input);

  const payment = await prisma.$transaction(async (tx) => {
    // Auto-assign receiptNumber per company (MAX + 1, race-safe inside transaction)
    const agg = await tx.payment.aggregate({
      _max: { receiptNumber: true },
      where: { company: data.company },
    });
    const nextReceiptNumber = (agg._max.receiptNumber ?? 0) + 1;

    const created = await tx.payment.create({
      data: {
        memberId: data.memberId,
        amount: data.amount,
        discount: data.discount,
        pendingAmount: data.pendingAmount,
        paymentMode: data.paymentMode,
        company: data.company,
        collectedById: session.user.id,
        notes: data.notes,
        receiptNumber: nextReceiptNumber,
        paymentType: data.paymentType,
        categoryLabel: data.categoryLabel,
        periodLabel: data.periodLabel,
        startDate: new Date(data.startDate),
        expiryDate: new Date(data.expiryDate),
        previousReceiptNo: data.previousReceiptNo ?? null,
        previousAmount: data.previousAmount ?? null,
      },
    });

    // Update member's last payment date and membership dates
    await tx.member.update({
      where: { id: data.memberId },
      data: {
        lastPaymentDate: new Date(),
        startDate: new Date(data.startDate),
        expiryDate: new Date(data.expiryDate),
        renewalDueDate: new Date(data.expiryDate),
        status: "ACTIVE",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Payment",
        entityId: created.id,
        newValues: {
          receiptNumber: nextReceiptNumber,
          amount: data.amount,
          company: data.company,
          paymentType: data.paymentType,
        },
      },
    });

    return created;
  });

  revalidatePath("/payments");
  revalidatePath(`/members/${data.memberId}`);
  revalidatePath("/");

  return { success: true, paymentId: payment.id };
}
