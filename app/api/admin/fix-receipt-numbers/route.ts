import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_SANE_RECEIPT = 9999;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bad = await prisma.payment.findMany({
      where: { receiptNumber: { gt: MAX_SANE_RECEIPT } },
      select: {
        id: true, receiptNumber: true, date: true, amount: true, company: true,
        member: { select: { fullName: true, memberId: true } },
      },
      orderBy: { receiptNumber: "asc" },
    });

    const maxGood = await prisma.payment.aggregate({
      _max: { receiptNumber: true },
      where: { receiptNumber: { lte: MAX_SANE_RECEIPT } },
    });

    return NextResponse.json({
      badCount: bad.length,
      maxGoodReceiptNumber: maxGood._max.receiptNumber ?? 0,
      samples: bad.slice(0, 20).map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        member: p.member.fullName,
        memberId: p.member.memberId,
        amount: Number(p.amount),
        company: p.company,
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

    // Find all corrupt receipts ordered by date so renumbering is chronological
    const bad = await prisma.payment.findMany({
      where: { receiptNumber: { gt: MAX_SANE_RECEIPT } },
      select: { id: true, receiptNumber: true, company: true, date: true,
        member: { select: { fullName: true, memberId: true } } },
      orderBy: [{ company: "asc" }, { date: "asc" }],
    });

    if (bad.length === 0) return NextResponse.json({ fixed: 0, results: [] });

    const results: string[] = [];

    // Process per company so each company's sequence stays independent
    const byCompany: Record<string, typeof bad> = {};
    for (const p of bad) {
      if (!byCompany[p.company]) byCompany[p.company] = [];
      byCompany[p.company].push(p);
    }

    for (const company of Object.keys(byCompany)) {
      // Get current max valid receipt number for this company
      const agg = await prisma.payment.aggregate({
        _max: { receiptNumber: true },
        where: { company: company as any, receiptNumber: { lte: MAX_SANE_RECEIPT } },
      });
      let next = (agg._max.receiptNumber ?? 0) + 1;

      for (const p of byCompany[company]) {
        const oldNum = p.receiptNumber;
        await prisma.payment.update({
          where: { id: p.id },
          data: { receiptNumber: next },
        });
        results.push(`✓ ${p.member.fullName} (${p.member.memberId}): #${oldNum} → #${next}`);
        next++;
      }
    }

    return NextResponse.json({ fixed: bad.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
