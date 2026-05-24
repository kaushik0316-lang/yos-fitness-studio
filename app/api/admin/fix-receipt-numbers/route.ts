import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Any receipt number above this is considered corrupt (Excel date serial etc.)
const MAX_SANE_RECEIPT = 9999;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bad = await prisma.payment.findMany({
      where: { receiptNumber: { gt: MAX_SANE_RECEIPT } },
      select: { id: true, receiptNumber: true, date: true, amount: true,
        member: { select: { fullName: true, memberId: true } } },
      orderBy: { receiptNumber: "asc" },
    });

    const maxGood = await prisma.payment.aggregate({
      _max: { receiptNumber: true },
      where: { receiptNumber: { lte: MAX_SANE_RECEIPT } },
    });

    return NextResponse.json({
      badCount: bad.length,
      maxGoodReceiptNumber: maxGood._max.receiptNumber ?? 0,
      samples: bad.slice(0, 10).map((p) => ({
        receiptNumber: p.receiptNumber,
        member: p.member.fullName,
        memberId: p.member.memberId,
        amount: Number(p.amount),
        date: p.date,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Null out all corrupt receipt numbers (> MAX_SANE_RECEIPT)
    const result = await prisma.payment.updateMany({
      where: { receiptNumber: { gt: MAX_SANE_RECEIPT } },
      data: { receiptNumber: null },
    });

    const maxGood = await prisma.payment.aggregate({
      _max: { receiptNumber: true },
      where: { receiptNumber: { not: null } },
    });

    return NextResponse.json({
      fixed: result.count,
      maxReceiptNumberNow: maxGood._max.receiptNumber ?? 0,
      message: `Cleared ${result.count} corrupt receipt number(s). Next new receipt will be #${(maxGood._max.receiptNumber ?? 0) + 1}.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
