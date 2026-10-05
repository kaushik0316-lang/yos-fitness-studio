import { prisma } from "@/lib/prisma";
import { Company } from "@prisma/client";

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

export type Bill = ReceiptPayload & { memberId: string; company: Company };

function methodLabel(method: string): string {
  const m = method.toLowerCase();
  if (m === "upi") return "UPI";
  if (m === "card") return "Card";
  if (m === "netbanking") return "Net banking";
  if (m === "wallet") return "Wallet";
  return method ? method : "online";
}

// Links created before multi-bill support stored a single bill with no member/company.
function billsOf(link: { memberId: string; company: Company; payload: unknown }): Bill[] {
  const p = link.payload as any;
  if (Array.isArray(p?.bills)) return p.bills as Bill[];
  return [{ ...(p as ReceiptPayload), memberId: link.memberId, company: link.company }];
}

// Turns a paid Razorpay link into real receipts (one per bill). Safe to call
// repeatedly for the same link: only the first call (CREATED -> PAID) creates them.
export async function finalizePaidLink(
  razorpayLinkId: string,
  rp: { id: string; method: string; amountPaise: number },
): Promise<{ ok: boolean; reason?: string; duplicate?: boolean; paymentId?: string }> {
  const link = await prisma.paymentLink.findUnique({ where: { razorpayLinkId } });
  if (!link) return { ok: false, reason: "unknown payment link" };
  if (link.status === "PAID") return { ok: true, duplicate: true, paymentId: link.paymentId ?? undefined };
  if (link.status !== "CREATED") return { ok: false, reason: `link is ${link.status}` };
  if (rp.amountPaise < Math.round(Number(link.amount) * 100)) return { ok: false, reason: "amount paid is less than the bill" };

  const bills = billsOf(link);
  const via = methodLabel(rp.method);
  const note = bills.length > 1
    ? `Paid online via Razorpay link (${via}; one payment, ${bills.length} receipts)`
    : `Paid online via Razorpay link (${via})`;

  for (let attempt = 0; ; attempt++) {
    try {
      const paymentId = await prisma.$transaction(async (tx) => {
        const claim = await tx.paymentLink.updateMany({
          where: { id: link.id, status: "CREATED" },
          data: { status: "PAID", paidAt: new Date(), razorpayPaymentId: rp.id },
        });
        if (claim.count === 0) return null; // another delivery already handled it

        let firstId: string | null = null;
        for (const p of bills) {
          const agg = await tx.payment.aggregate({ _max: { receiptNumber: true }, where: { company: p.company } });
          const created = await tx.payment.create({
            data: {
              memberId: p.memberId,
              amount: p.amount,
              discount: p.discount,
              pendingAmount: p.pendingAmount,
              paymentMode: "RAZORPAY",
              company: p.company,
              collectedById: link.createdById,
              soldById: p.soldById ?? null,
              soldById2: p.soldById2 ?? null,
              soldByPct: p.soldById2 ? (p.soldByPct ?? 100) : 100,
              transactionRef: rp.id,
              notes: [p.notes, note].filter(Boolean).join(" · "),
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
          if (!firstId) firstId = created.id;

          if (p.paymentType === "BALANCE" && p.previousReceiptNo) {
            const original = await tx.payment.findFirst({
              where: { company: p.company, receiptNumber: p.previousReceiptNo },
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
            const m = await tx.member.findUnique({ where: { id: p.memberId }, select: { expiryDate: true } });
            shouldUpdateExpiry = !m?.expiryDate || newExpiry > m.expiryDate;
          }
          await tx.member.update({
            where: { id: p.memberId },
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

          await tx.auditLog.create({
            data: {
              userId: link.createdById,
              action: "CREATE",
              entity: "Payment",
              entityId: created.id,
              newValues: { receiptNumber: created.receiptNumber, amount: p.amount, via: "razorpay", razorpayPaymentId: rp.id },
            },
          });
        }

        await tx.paymentLink.update({ where: { id: link.id }, data: { paymentId: firstId } });
        return firstId;
      }, { timeout: 30000, maxWait: 10000 });
      return { ok: true, paymentId: paymentId ?? undefined, duplicate: paymentId === null };
    } catch (e: any) {
      if (e.code === "P2002" && (e.meta?.target as string[] | undefined)?.includes("receiptNumber") && attempt < 4) continue;
      throw e;
    }
  }
}
