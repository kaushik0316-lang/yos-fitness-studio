import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TEST_MEMBER_ID = "YF-2901";

// Temporary. Default = read-only report. ?apply=1 permanently deletes ALL payments
// of the test member (only if every one of them is <= Rs.1), so receipt numbers free up.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== "yos-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apply = req.nextUrl.searchParams.get("apply") === "1";

  const member = await prisma.member.findUnique({
    where: { memberId: TEST_MEMBER_ID },
    select: { id: true, memberId: true, fullName: true, status: true, startDate: true, expiryDate: true, renewalDueDate: true, lastPaymentDate: true, currentPackageId: true },
  });
  if (!member) return NextResponse.json({ error: "test member not found" }, { status: 404 });

  const payments = await prisma.payment.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, receiptNumber: true, company: true, amount: true, discount: true, isVoided: true,
      paymentMode: true, date: true, transactionRef: true,
      membership: { select: { id: true } },
      _count: { select: { trainerCommissions: true } },
    },
  });
  const links = await prisma.paymentLink.findMany({
    where: { memberId: member.id },
    select: { id: true, status: true, amount: true, paymentId: true, razorpayPaymentId: true },
  });
  const top: Record<string, string[]> = {};
  for (const company of ["YOS_FITNESS", "YOS_FITNESS_STUDIO"] as const) {
    const rows = await prisma.payment.findMany({
      where: { company }, orderBy: { receiptNumber: "desc" }, take: 6,
      select: { receiptNumber: true, isVoided: true, amount: true, member: { select: { memberId: true } } },
    });
    top[company] = rows.map((r) => `#${r.receiptNumber} ${r.member.memberId} Rs.${r.amount}${r.isVoided ? " VOID" : ""}`);
  }

  const report = {
    member,
    payments: payments.map((p) => ({
      id: p.id, receipt: p.receiptNumber, company: p.company, amount: String(p.amount), discount: String(p.discount),
      voided: p.isVoided, mode: p.paymentMode, date: p.date, ref: p.transactionRef,
      hasMembership: !!p.membership, commissions: p._count.trainerCommissions,
    })),
    paymentLinks: links.map((l) => ({ ...l, amount: String(l.amount) })),
    topReceiptsPerCompany: top,
  };
  if (!apply) return NextResponse.json({ applied: false, ...report });

  const net = (p: (typeof payments)[number]) => Number(p.amount) - Number(p.discount);
  if (payments.length === 0) return NextResponse.json({ applied: false, error: "nothing to delete", ...report });
  if (payments.some((p) => net(p) > 1)) {
    return NextResponse.json({ applied: false, error: "refusing: member has a payment larger than Rs.1", ...report }, { status: 409 });
  }

  const ids = payments.map((p) => p.id);
  const result = await prisma.$transaction(async (tx) => {
    await tx.paymentLink.updateMany({ where: { paymentId: { in: ids } }, data: { paymentId: null } });
    const commissions = await tx.trainerCommission.deleteMany({ where: { paymentId: { in: ids } } });
    const memberships = await tx.membership.deleteMany({ where: { paymentId: { in: ids } } });
    const deleted = await tx.payment.deleteMany({ where: { id: { in: ids } } });
    return { payments: deleted.count, memberships: memberships.count, commissions: commissions.count };
  });
  return NextResponse.json({ applied: true, deleted: result, ...report });
}
