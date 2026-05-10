"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Company, PaymentMode, MemberStatus } from "@prisma/client";
import { addDays } from "date-fns";
import { z } from "zod";

const paymentSchema = z.object({
  memberId: z.string(),
  amount: z.number().positive(),
  discount: z.number().default(0),
  pendingAmount: z.number().default(0),
  paymentMode: z.nativeEnum(PaymentMode),
  packageId: z.string().optional(),
  company: z.nativeEnum(Company),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
  createMembership: z.boolean().default(false),
  startDate: z.string().optional(),
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
        transactionRef: data.transactionRef,
        notes: data.notes,
      },
    });

    // Optionally create/extend membership
    if (data.createMembership && data.packageId && data.startDate) {
      const pkg = await tx.package.findUnique({ where: { id: data.packageId } });
      if (pkg) {
        const startDate = new Date(data.startDate);
        const expiryDate = addDays(startDate, pkg.durationDays);

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
