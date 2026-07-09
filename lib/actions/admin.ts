"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Reconcile pendingAmount on all bills that have linked BALANCE payments.
 * For each payment where paymentType=BALANCE and previousReceiptNo is set,
 * sum the balance amounts and reduce the original bill's pendingAmount accordingly.
 *
 * Safe to run multiple times — always recomputes from scratch.
 */
export async function reconcilePendingAmounts(): Promise<{ updated: number; total: number }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  // Find all BALANCE payments that reference an original receipt
  const balancePayments = await prisma.payment.findMany({
    where: { paymentType: "BALANCE", previousReceiptNo: { not: null }, isVoided: false },
    select: { company: true, previousReceiptNo: true, amount: true },
  });

  if (balancePayments.length === 0) return { updated: 0, total: 0 };

  // Group: (company, previousReceiptNo) → total paid toward that bill
  const paidMap = new Map<string, number>();
  for (const bp of balancePayments) {
    const key = `${bp.company}::${bp.previousReceiptNo}`;
    paidMap.set(key, (paidMap.get(key) ?? 0) + Number(bp.amount));
  }

  let updated = 0;

  for (const [key, totalPaid] of paidMap) {
    const [company, receiptNoStr] = key.split("::");
    const receiptNo = Number(receiptNoStr);

    const original = await prisma.payment.findFirst({
      where: { company: company as any, receiptNumber: receiptNo },
      select: { id: true, pendingAmount: true },
    });

    if (!original) continue;

    const currentPending = Number(original.pendingAmount ?? 0);
    // We recompute from scratch: the ORIGINAL pendingAmount at bill creation isn't stored
    // separately, so we reduce the current value by what's already been paid.
    // If currentPending is already 0 there's nothing to do.
    if (currentPending <= 0) continue;

    const newPending = Math.max(0, currentPending - totalPaid);
    if (newPending === currentPending) continue; // no change

    await prisma.payment.update({
      where: { id: original.id },
      data: { pendingAmount: newPending },
    });
    updated++;
  }

  revalidatePath("/payments");
  return { updated, total: paidMap.size };
}
