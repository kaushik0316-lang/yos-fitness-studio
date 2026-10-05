"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Company, PaymentType } from "@prisma/client";
import { z } from "zod";
import { createRazorpayPaymentLink, razorpayConfigured } from "@/lib/razorpay";

const linkSchema = z.object({
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

const LINK_VALID_DAYS = 3;

export async function createPaymentLink(input: z.infer<typeof linkSchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const { role } = session.user;
  if (role !== "ADMIN" && role !== "FRONT_DESK" && role !== "ACCOUNTANT") throw new Error("Forbidden");
  if (!razorpayConfigured()) throw new Error("Online payments aren't set up yet. Add the Razorpay keys in Vercel first.");

  const data = linkSchema.parse(input);
  const net = data.amount - data.discount;
  if (net < 1) throw new Error("The amount to pay must be at least ₹1.");

  const member = await prisma.member.findUnique({
    where: { id: data.memberId },
    select: { id: true, fullName: true, phone: true },
  });
  if (!member) throw new Error("Member not found.");

  const row = await prisma.paymentLink.create({
    data: {
      memberId: member.id,
      createdById: session.user.id,
      company: data.company,
      amount: net,
      payload: {
        paymentType: data.paymentType,
        categoryLabel: data.categoryLabel,
        periodLabel: data.periodLabel,
        amount: data.amount,
        discount: data.discount,
        pendingAmount: data.pendingAmount,
        startDate: data.startDate,
        expiryDate: data.expiryDate,
        previousReceiptNo: data.previousReceiptNo,
        previousAmount: data.previousAmount,
        notes: data.notes,
        soldById: data.soldById,
        soldById2: data.soldById2,
        soldByPct: data.soldByPct,
      },
    },
  });

  try {
    const digits = member.phone.replace(/\D/g, "").slice(-10);
    const realPhone = digits.length === 10 && !/^(\d)\1+$/.test(digits);
    const link = await createRazorpayPaymentLink({
      amountPaise: Math.round(net * 100),
      description: `${data.categoryLabel} — ${data.periodLabel}`,
      referenceId: row.id,
      customerName: member.fullName,
      customerContact: realPhone ? digits : undefined,
      expireBy: Math.floor(Date.now() / 1000) + LINK_VALID_DAYS * 24 * 3600,
    });
    await prisma.paymentLink.update({
      where: { id: row.id },
      data: { razorpayLinkId: link.id, shortUrl: link.shortUrl },
    });
    return { shortUrl: link.shortUrl, amount: net, validDays: LINK_VALID_DAYS };
  } catch (e) {
    await prisma.paymentLink.update({ where: { id: row.id }, data: { status: "CANCELLED" } });
    throw e;
  }
}
