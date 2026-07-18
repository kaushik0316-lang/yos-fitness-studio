"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Company, PaymentMode, PaymentType, MemberStatus } from "@prisma/client";
import { addDays } from "date-fns";
import { ucase } from "@/lib/utils";
import { z } from "zod";

const paymentSchema = z.object({
  memberId: z.string(),
  amount: z.number().positive(),
  discount: z.number().nonnegative().default(0),
  pendingAmount: z.number().nonnegative().default(0),
  paymentMode: z.nativeEnum(PaymentMode),
  packageId: z.string().optional(),
  company: z.nativeEnum(Company),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
  createMembership: z.boolean().default(false),
  startDate: z.string().optional(),
  paymentType: z.nativeEnum(PaymentType).optional(),
  previousReceiptNo: z.number().optional(),
  // Trainer commission — optional
  commissionTrainerId: z.string().optional(),
  commissionPct:       z.number().min(0).max(100).optional(),
  memberName:          z.string().optional(),
  packageName:         z.string().optional(),
});

export async function recordPayment(input: z.infer<typeof paymentSchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const data = paymentSchema.parse(input);

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        memberId: data.memberId,
        amount: data.amount,
        discount: data.discount,
        pendingAmount: data.pendingAmount,
        paymentMode: data.paymentMode,
        packageId: data.packageId ?? null,
        company: data.company,
        collectedById: session.user.id,
        transactionRef: ucase(data.transactionRef),
        notes: ucase(data.notes),
        paymentType: data.paymentType ?? undefined,
        previousReceiptNo: data.previousReceiptNo ?? null,
      },
    });

    // If this is a BALANCE payment referencing a previous receipt,
    // reduce that receipt's pendingAmount by the amount just paid (floor at 0).
    if (data.paymentType === "BALANCE" && data.previousReceiptNo) {
      const original = await tx.payment.findFirst({
        where: { company: data.company, receiptNumber: data.previousReceiptNo },
        select: { id: true, pendingAmount: true },
      });
      if (original) {
        const newPending = Math.max(0, Number(original.pendingAmount ?? 0) - data.amount);
        await tx.payment.update({ where: { id: original.id }, data: { pendingAmount: newPending } });
      }
    }

    // Optionally create/extend membership
    if (data.createMembership && data.packageId && data.startDate) {
      const pkg = await tx.package.findUnique({ where: { id: data.packageId } });
      if (pkg) {
        const startDate = new Date(data.startDate);
        const expiryDate = addDays(startDate, pkg.durationDays);

        // Write startDate + expiryDate onto the payment row so the receipt shows them
        await tx.payment.update({
          where: { id: payment.id },
          data: { startDate, expiryDate },
        });

        await tx.membership.create({
          data: {
            memberId: data.memberId,
            packageId: data.packageId,
            startDate,
            expiryDate,
            company: data.company,
            amount: data.amount,
            discount: data.discount,
            paymentId: payment.id,
          },
        });

        await tx.member.update({
          where: { id: data.memberId },
          data: {
            status: MemberStatus.ACTIVE,
            currentPackageId: data.packageId,
            startDate,
            expiryDate,
            renewalDueDate: expiryDate,
            lastPaymentDate: new Date(),
          },
        });
      }
    } else if (data.packageId) {
      await tx.member.update({
        where: { id: data.memberId },
        data: { lastPaymentDate: new Date() },
      });
    }

    // Trainer commission linked to this bill
    if (data.commissionTrainerId && data.commissionPct) {
      const commissionAmount = Math.round(data.amount * data.commissionPct) / 100;
      const paymentDate = payment.createdAt ?? new Date();
      await tx.trainerCommission.create({
        data: {
          trainerId:       data.commissionTrainerId,
          paymentId:       payment.id,
          clientName:      data.memberName ?? "Unknown",
          packageType:     data.packageName ?? "OTHER",
          totalAmount:     data.amount,
          commissionPct:   data.commissionPct,
          commissionAmount,
          month:           paymentDate.getMonth() + 1,
          year:            paymentDate.getFullYear(),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PAYMENT",
        entity: "Payment",
        entityId: payment.id,
        newValues: { amount: data.amount, company: data.company, paymentMode: data.paymentMode },
      },
    });

    return payment;
  });

  revalidatePath("/payments");
  revalidatePath(`/members/${data.memberId}`);
  revalidatePath("/");
  revalidatePath("/reports");

  return { success: true, paymentId: result.id };
}
