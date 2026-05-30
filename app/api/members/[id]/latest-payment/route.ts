import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payment = await prisma.payment.findFirst({
    where: { memberId: params.id },
    orderBy: { date: "desc" },
    select: {
      id: true,
      receiptNumber: true,
      date: true,
      amount: true,
      pendingAmount: true,
      discount: true,
      paymentMode: true,
      paymentType: true,
      categoryLabel: true,
      periodLabel: true,
      startDate: true,
      expiryDate: true,
      company: true,
      package: { select: { name: true } },
    },
  });

  if (!payment)
    return NextResponse.json({ error: "No payment found" }, { status: 404 });

  return NextResponse.json(payment);
}
