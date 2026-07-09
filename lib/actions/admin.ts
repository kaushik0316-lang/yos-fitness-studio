"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Two-pass reconciliation of pendingAmount fields:
 *
 * Pass 1 — Linked BALANCE payments (have previousReceiptNo):
 *   Sum all balance amounts paid against each original bill and reduce accordingly.
 *
 * Pass 2 — Unlinked BALANCE payments (paymentType=BALANCE, no previousReceiptNo):
 *   For each member, apply their unlinked BALANCE payments (oldest first) to their
 *   oldest outstanding bills. Same logic a gym cashier would use.
 *
 * Safe to run multiple times — always reads current DB state.
 */
export async function reconcilePendingAmounts(): Promise<{ updated: number; linkedGroups: number; unlinkedMembers: number }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  let updated = 0;

  // ── Pass 1: linked BALANCE payments ──────────────────────────────────────
  const linkedPayments = await prisma.payment.findMany({
    where: { paymentType: "BALANCE", previousReceiptNo: { not: null }, isVoided: false },
    select: { company: true, previousReceiptNo: true, amount: true },
  });

  const linkedMap = new Map<string, number>();
  for (const bp of linkedPayments) {
    const key = `${bp.company}::${bp.previousReceiptNo}`;
    linkedMap.set(key, (linkedMap.get(key) ?? 0) + Number(bp.amount));
  }

  for (const [key, totalPaid] of Array.from(linkedMap)) {
    const [company, receiptNoStr] = key.split("::");
    const original = await prisma.payment.findFirst({
      where: { company: company as any, receiptNumber: Number(receiptNoStr) },
      select: { id: true, pendingAmount: true },
    });
    if (!original || Number(original.pendingAmount) <= 0) continue;
    const newPending = Math.max(0, Number(original.pendingAmount) - totalPaid);
    if (newPending !== Number(original.pendingAmount)) {
      await prisma.payment.update({ where: { id: original.id }, data: { pendingAmount: newPending } });
      updated++;
    }
  }

  // ── Pass 2: unlinked BALANCE payments ────────────────────────────────────
  const unlinked = await prisma.payment.findMany({
    where: { paymentType: "BALANCE", previousReceiptNo: null, isVoided: false },
    select: { id: true, memberId: true, company: true, amount: true, date: true },
    orderBy: { date: "asc" },
  });

  // unique member IDs that have unlinked BALANCE payments
  const memberIds = Array.from(new Set(unlinked.map((p) => p.memberId)));
  let unlinkedMembers = 0;

  for (const memberId of memberIds) {
    const memberBalances = unlinked
      .filter((p) => p.memberId === memberId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Outstanding bills for this member — exclude BALANCE type payments themselves
    const outstandingBills = await prisma.payment.findMany({
      where: {
        memberId,
        isVoided: false,
        pendingAmount: { gt: 0 },
        paymentType: { not: "BALANCE" },
      },
      select: { id: true, pendingAmount: true },
      orderBy: { date: "asc" },
    });

    if (outstandingBills.length === 0) continue;

    // Compute final pendingAmount for each bill after applying balance payments
    const finalPending = outstandingBills.map((b) => ({
      id: b.id,
      pending: Number(b.pendingAmount),
    }));

    let billIdx = 0;
    let memberHadChanges = false;

    for (const bp of memberBalances) {
      let remaining = Number(bp.amount);
      while (remaining > 0 && billIdx < finalPending.length) {
        const bill = finalPending[billIdx];
        if (bill.pending <= 0) { billIdx++; continue; }
        const reduce = Math.min(remaining, bill.pending);
        bill.pending -= reduce;
        remaining -= reduce;
        if (bill.pending <= 0) billIdx++;
      }
    }

    // Apply only the bills that actually changed
    for (let i = 0; i < finalPending.length; i++) {
      const original = Number(outstandingBills[i].pendingAmount);
      const newVal   = finalPending[i].pending;
      if (newVal !== original) {
        await prisma.payment.update({
          where: { id: finalPending[i].id },
          data:  { pendingAmount: newVal },
        });
        updated++;
        memberHadChanges = true;
      }
    }

    if (memberHadChanges) unlinkedMembers++;
  }

  revalidatePath("/payments");
  return { updated, linkedGroups: linkedMap.size, unlinkedMembers };
}

/**
 * Clear (zero out) the pendingAmount on a single payment.
 * Used when the admin knows the balance was collected but not linked.
 */
export async function clearPendingAmount(paymentId: string): Promise<void> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.payment.update({
    where: { id: paymentId },
    data:  { pendingAmount: 0 },
  });

  revalidatePath("/payments");
}
