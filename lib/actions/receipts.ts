"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Company, PaymentMode, PaymentType } from "@prisma/client";
import { z } from "zod";

const receiptSchema = z.object({
  memberId: z.string().optional(),
  newMemberName: z.string().optional(),
  newMemberPhone: z.string().optional(),
  company: z.nativeEnum(Company),
  paymentType: z.nativeEnum(PaymentType),
  categoryLabel: z.string(),
  periodLabel: z.string(),
  amount: z.number().positive(),
  discount: z.number().nonnegative().default(0),
  pendingAmount: z.number().nonnegative().default(0),
  paymentMode: z.nativeEnum(PaymentMode),
  billDate: z.string().optional(), // "YYYY-MM-DD" — defaults to today if omitted
  startDate: z.string(), // "YYYY-MM-DD"
  expiryDate: z.string(), // "YYYY-MM-DD"
  previousReceiptNo: z.number().optional(),
  previousAmount: z.number().optional(),
  notes: z.string().optional(),
  soldById: z.string().optional(), // employee who made the sale; null = common/unattributed
  phoneOverride: z.string().optional(), // save phone to member profile if they had none
  splitPaymentMode: z.nativeEnum(PaymentMode).optional(),
  splitAmount: z.number().optional(),
  cardCharge: z.number().nonnegative().optional(),
});

export async function createReceipt(input: z.infer<typeof receiptSchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const { role } = session.user;
  if (role !== "ADMIN" && role !== "FRONT_DESK" && role !== "ACCOUNTANT") {
    throw new Error("Forbidden");
  }

  const data = receiptSchema.parse(input);

  if (!data.memberId && !data.newMemberName?.trim()) {
    throw new Error("Please select a member or enter a new member name.");
  }

  let payment: Awaited<ReturnType<typeof prisma.payment.create>>;
  // Retry up to 5 times on receipt number collision (race condition guard)
  for (let attempt = 0; ; attempt++) {
    try {
      payment = await prisma.$transaction(async (tx) => {
    // ── Create new member on the fly if needed ────────────────────────────
    let resolvedMemberId = data.memberId ?? "";
    if (!resolvedMemberId && data.newMemberName?.trim()) {
      const name = data.newMemberName.trim().replace(/\w+/g, (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      const prefix = data.company === "YOS_FITNESS" ? "YF" : "YFS";
      const existing = await tx.member.findMany({
        where: { memberId: { startsWith: `${prefix}-` } },
        select: { memberId: true },
      });
      const maxNum = existing.reduce((max, m) => {
        const n = parseInt(m.memberId.split("-")[1] ?? "0", 10);
        return n > max ? n : max;
      }, 0);
      const nextMemberId = `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
      const phone = data.newMemberPhone?.trim() || "0000000000";
      const newMember = await tx.member.create({
        data: {
          memberId: nextMemberId,
          fullName: name,
          phone,
          whatsapp: phone,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      resolvedMemberId = newMember.id;
    }

    // Auto-assign receiptNumber per company (MAX + 1, race-safe inside transaction)
    const agg = await tx.payment.aggregate({
      _max: { receiptNumber: true },
      where: { company: data.company },
    });
    const nextReceiptNumber = (agg._max.receiptNumber ?? 0) + 1;

    const created = await tx.payment.create({
      data: {
        memberId: resolvedMemberId,
        amount: data.amount,
        discount: data.discount,
        pendingAmount: data.pendingAmount,
        paymentMode: data.paymentMode,
        splitPaymentMode: data.splitPaymentMode ?? null,
        splitAmount: data.splitAmount ?? null,
        cardCharge: data.cardCharge && data.cardCharge > 0 ? data.cardCharge : null,
        company: data.company,
        collectedById: session.user.id,
        soldById: data.soldById ?? null,
        notes: data.notes,
        receiptNumber: nextReceiptNumber,
        paymentType: data.paymentType,
        categoryLabel: data.categoryLabel,
        periodLabel: data.periodLabel,
        date: data.billDate ? new Date(data.billDate) : new Date(),
        startDate: new Date(data.startDate),
        expiryDate: new Date(data.expiryDate),
        previousReceiptNo: data.previousReceiptNo ?? null,
        previousAmount: data.previousAmount ?? null,
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
        const oldPending = Number(original.pendingAmount ?? 0);
        const newPending = Math.max(0, oldPending - data.amount);
        await tx.payment.update({
          where: { id: original.id },
          data: { pendingAmount: newPending },
        });
      }
    }

    // Update member's last payment date, membership dates, and phone if provided
    const memberUpdate: Record<string, any> = {
      lastPaymentDate: new Date(),
      startDate: new Date(data.startDate),
      expiryDate: new Date(data.expiryDate),
      renewalDueDate: new Date(data.expiryDate),
      status: "ACTIVE",
    };
    if (data.phoneOverride && data.phoneOverride.replace(/\D/g, "").length >= 9) {
      memberUpdate.phone = data.phoneOverride.trim();
      memberUpdate.whatsapp = data.phoneOverride.trim();
    }
    await tx.member.update({ where: { id: resolvedMemberId }, data: memberUpdate });

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
      break; // success — exit retry loop
    } catch (e: any) {
      if (e.code === "P2002" && (e.meta?.target as string[] | undefined)?.includes("receiptNumber") && attempt < 4) {
        continue; // collision on receipt number — retry
      }
      throw e;
    }
  }

  revalidatePath("/payments");
  revalidatePath("/members");
  revalidatePath("/");

  return { success: true, paymentId: payment!.id };
}
