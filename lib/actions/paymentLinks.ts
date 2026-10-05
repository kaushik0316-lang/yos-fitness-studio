"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Company, PaymentType } from "@prisma/client";
import { z } from "zod";
import { createRazorpayPaymentLink, razorpayConfigured } from "@/lib/razorpay";

const billSchema = z.object({
  memberId: z.string(),
  company: z.nativeEnum(Company),
  paymentType: z.nativeEnum(PaymentType),
  categoryLabel: z.string(),
  periodLabel: z.string(),
  amount: z.number().positive(),
  discount: z.number().nonnegative().default(0),
  pendingAmount: z.number().nonnegative().default(0),
  startDate: z.string(),
  expiryDate: z.string(),
  previousReceiptNo: z.number().optional(),
  previousAmount: z.number().optional(),
  notes: z.string().optional(),
  soldById: z.string().optional(),
  soldById2: z.string().optional(),
  soldByPct: z.number().int().min(1).max(99).optional(),
});

const linkSchema = z.object({ bills: z.array(billSchema).min(1).max(10) });

const LINK_VALID_DAYS = 3;

// One link for the total of one or more bills; each bill becomes its own receipt once paid.
export async function createPaymentLink(input: z.infer<typeof linkSchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const { role } = session.user;
  if (role !== "ADMIN" && role !== "FRONT_DESK" && role !== "ACCOUNTANT") throw new Error("Forbidden");
  if (!razorpayConfigured()) throw new Error("Online payments aren't set up yet. Add the Razorpay keys in Vercel first.");

  const { bills } = linkSchema.parse(input);
  const total = bills.reduce((sum, b) => sum + (b.amount - b.discount), 0);
  if (bills.some((b) => b.amount - b.discount < 0)) throw new Error("A discount is larger than its bill.");
  if (total < 1) throw new Error("The amount to pay must be at least ₹1.");

  const members = await prisma.member.findMany({
    where: { id: { in: bills.map((b) => b.memberId) } },
    select: { id: true, fullName: true, phone: true },
  });
  const byId = new Map(members.map((m) => [m.id, m]));
  if (bills.some((b) => !byId.has(b.memberId))) throw new Error("Member not found.");
  const payer = byId.get(bills[0].memberId)!;

  const row = await prisma.paymentLink.create({
    data: {
      memberId: payer.id,
      createdById: session.user.id,
      company: bills[0].company,
      amount: total,
      payload: { bills },
    },
  });

  try {
    const digits = payer.phone.replace(/\D/g, "").slice(-10);
    const realPhone = digits.length === 10 && !/^(\d)\1+$/.test(digits);
    const description = bills
      .map((b) => `${byId.get(b.memberId)!.fullName.split(" ")[0]}: ${b.categoryLabel} ${b.periodLabel}`)
      .join("; ")
      .slice(0, 400);
    const link = await createRazorpayPaymentLink({
      amountPaise: Math.round(total * 100),
      description,
      referenceId: row.id,
      customerName: payer.fullName,
      customerContact: realPhone ? digits : undefined,
      expireBy: Math.floor(Date.now() / 1000) + LINK_VALID_DAYS * 24 * 3600,
    });
    await prisma.paymentLink.update({
      where: { id: row.id },
      data: { razorpayLinkId: link.id, shortUrl: link.shortUrl },
    });
    return { shortUrl: link.shortUrl, amount: total, validDays: LINK_VALID_DAYS };
  } catch (e) {
    await prisma.paymentLink.update({ where: { id: row.id }, data: { status: "CANCELLED" } });
    throw e;
  }
}
