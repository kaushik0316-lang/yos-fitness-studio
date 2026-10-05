import { prisma } from "@/lib/prisma";
import { PaymentMode } from "@prisma/client";

export type ReceiptPayload = {
  paymentType: "ADMISSION" | "RENEWAL" | "BALANCE" | "UPGRADE";
  categoryLabel: string;
  periodLabel: string;
  amount: number;
  discount: number;
  pendingAmount: number;
  startDate: string;
  expiryDate: string;
  previousReceiptNo?: number;
  previousAmount?: number;
  notes?: string;
  soldById?: string;
  soldById2?: string;
  soldByPct?: number;
};

function modeFor(method: string): PaymentMode {
  if (method === "upi" || method === "wallet") return "UPI";
  if (method === "card" || method === "emi" || method === "paylater") return "CARD";
  return "BANK_TRANSFER";
}

// Turns a paid Razorpay link into a real receipt. Safe to call repeatedly for the
// same link: only the first call (CREATED -> PAID) creates the receipt.
export async function finalizePaidLink(
  razorpayLinkId: string,
  rp: { id: string; method: string; amountPaise: number },
): Promise<{ ok: boolean; reason?: string; duplicate?: boolean; paymentId?: string }> {
  const link = await prisma.paymentLink.findUnique({ where: { razorpayLinkId } });
  if (!link) return { ok: false, reason: "unknown payment link" };
  if (link.status === "PAID") return { ok: true, duplicate: true, paymentId: link.paymentId ?? undefined };
  if (link.status !== "CREATED") return { ok: false, reason: `link is ${link.status}` };
  if (rp.amountPaise < Math.round(Number(link.amount) * 100)) return { ok: false, reason: "amount paid is less than the bill" };

  const p = link.payload as unknown as ReceiptPayload;
  const mode = modeFor(rp.method);

  for (let attempt = 0; ; attempt++) {
    try {
      const paymentId = await prisma.$transaction(async (tx) => {
        const claim = await tx.paymentLink.updateMany({
          where: { id: link.id, status: "CREATED" },
          data: { status: "PAID", paidAt: new Date(), razorpayPaymentId: rp.id },
        });
        if (claim.count === 0) return null; // another delivery already handled it

        const agg = await tx.payment.aggregate({ _max: { receiptNumber: true }, where: { company: link.company } });
        const created = await tx.payment.create({
          data: {
            memberId: link.memberId,
            amount: p.amount,
            discount: p.discount,
            pendingAmount: p.pendingAmount,
            paymentMode: mode,
            company: link.company,
            collectedById: link.createdById,
            soldById: p.soldById ?? null,
            soldById2: p.soldById2 ?? null,
            soldByPct: p.soldById2 ? (p.soldByPct ?? 100) : 100,
            transactionRef: rp.id,
            notes: [p.notes, "Paid online via Razorpay link"].filter(Boolean).join(" · "),
            receiptNumber: (agg._max.receiptNumber ?? 0) + 1,
            paymentType: p.paymentType,
            categoryLabel: p.categoryLabel,
            periodLabel: p.periodLabel,
            startDate: new Date(p.startDate),
            expiryDate: new Date(p.expiryDate),
            previousReceiptNo: p.previousReceiptNo ?? null,
            previousAmount: p.previousAmount ?? null,
          },
        });

        if (p.paymentType === "BALANCE" && p.previousReceiptNo) {
          const original = await tx.payment.findFirst({
            where: { company: link.company, receiptNumber: p.previousReceiptNo },
            select: { id: true, pendingAmount: true },
          });
          if (original) {
            await tx.payment.update({
              where: { id: original.id },
              data: { pendingAmount: Math.max(0, Number(original.pendingAmount ?? 0) - p.amount) },
            });
          }
        }

        // Same membership-date rules as a receipt created by staff
        const isAddOn = /pt|personal\s*train|semi[\s-]?private|hiit/i.test(p.categoryLabel ?? "");
        const newExpiry = new Date(p.expiryDate);
        let shouldUpdateExpiry = true;
        if (!isAddOn) {
          const m = await tx.member.findUnique({ where: { id: link.memberId }, select: { expiryDate: true } });
          shouldUpdateExpiry = !m?.expiryDate || newExpiry > m.expiryDate;
        }
        await tx.member.update({
          where: { id: link.memberId },
          data: {
            lastPaymentDate: new Date(),
            status: "ACTIVE",
            ...(!isAddOn && shouldUpdateExpiry && {
              startDate: new Date(p.startDate),
              expiryDate: newExpiry,
              renewalDueDate: newExpiry,
            }),
          },
        });

        await tx.paymentLink.update({ where: { id: link.id }, data: { paymentId: created.id } });
        await tx.auditLog.create({
          data: {
            userId: link.createdById,
            action: "CREATE",
            entity: "Payment",
            entityId: created.id,
            newValues: { receiptNumber: created.receiptNumber, amount: p.amount, via: "razorpay", razorpayPaymentId: rp.id },
          },
        });
        return created.id;
      });
      return { ok: true, paymentId: paymentId ?? undefined, duplicate: paymentId === null };
    } catch (e: any) {
      if (e.code === "P2002" && (e.meta?.target as string[] | undefined)?.includes("receiptNumber") && attempt < 4) continue;
      throw e;
    }
  }
}
