import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { PaymentMode, PaymentType, Company } from "@prisma/client";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rl = checkRateLimit(`${ip}:staff-receipt`, { maxAttempts: 30, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const { pin, memberId, newMemberName, newMemberPhone,
            company, paymentType, categoryLabel, periodLabel,
            amount, discount, pendingAmount, paymentMode,
            splitPaymentMode, splitAmount,
            billDate, startDate, expiryDate, notes } = body;

    if (!pin) return NextResponse.json({ error: "PIN required" }, { status: 401 });

    // Validate PIN → get employee
    const employee = await prisma.employee.findUnique({
      where: { pin: String(pin) },
      select: { id: true, fullName: true, isActive: true },
    });
    if (!employee?.isActive) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });

    // Need a CRM user as collectedById — use the first admin
    const systemUser = await prisma.user.findFirst({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });
    if (!systemUser) return NextResponse.json({ error: "System config error" }, { status: 500 });

    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    if (!memberId && !newMemberName?.trim()) return NextResponse.json({ error: "Member required" }, { status: 400 });

    const payment = await prisma.$transaction(async (tx) => {
      // Create new member on the fly if needed
      let resolvedMemberId = memberId ?? "";
      if (!resolvedMemberId && newMemberName?.trim()) {
        const name = newMemberName.trim().replace(/\w+/g, (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        const prefix = company === "YOS_FITNESS_STUDIO" ? "YFS" : "YF";
        const existing = await tx.member.findMany({
          where: { memberId: { startsWith: `${prefix}-` } },
          select: { memberId: true },
        });
        const maxNum = existing.reduce((max, m) => {
          const n = parseInt(m.memberId.split("-")[1] ?? "0", 10);
          return n > max ? n : max;
        }, 0);
        const nextMemberId = `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
        const phone = newMemberPhone?.trim() || "0000000000";
        const newMember = await tx.member.create({
          data: { memberId: nextMemberId, fullName: name, phone, whatsapp: phone, status: "ACTIVE" },
          select: { id: true },
        });
        resolvedMemberId = newMember.id;
      }

      // Next receipt number for this company
      const agg = await tx.payment.aggregate({
        _max: { receiptNumber: true },
        where: { company: company as Company },
      });
      const nextReceiptNumber = (agg._max.receiptNumber ?? 0) + 1;

      const created = await tx.payment.create({
        data: {
          memberId: resolvedMemberId,
          amount: Number(amount),
          discount: Number(discount) || 0,
          pendingAmount: Number(pendingAmount) || 0,
          paymentMode: paymentMode as PaymentMode,
          splitPaymentMode: splitPaymentMode ? (splitPaymentMode as PaymentMode) : null,
          splitAmount: splitAmount ? Number(splitAmount) : null,
          company: company as Company,
          collectedById: systemUser.id,
          soldById: employee.id,
          notes: notes || null,
          receiptNumber: nextReceiptNumber,
          paymentType: (paymentType as PaymentType) ?? "ADMISSION",
          categoryLabel: categoryLabel || "General Fitness",
          periodLabel: periodLabel || "",
          date: billDate ? new Date(billDate) : new Date(),
          startDate: startDate ? new Date(startDate) : new Date(),
          expiryDate: expiryDate ? new Date(expiryDate) : new Date(),
        },
        select: { id: true, receiptNumber: true },
      });

      // Update member dates
      await tx.member.update({
        where: { id: resolvedMemberId },
        data: {
          lastPaymentDate: new Date(),
          startDate: startDate ? new Date(startDate) : new Date(),
          expiryDate: expiryDate ? new Date(expiryDate) : new Date(),
          renewalDueDate: expiryDate ? new Date(expiryDate) : new Date(),
          status: "ACTIVE",
        },
      });

      return created;
    });

    return NextResponse.json({ paymentId: payment.id, receiptNumber: payment.receiptNumber });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Something went wrong" }, { status: 500 });
  }
}
