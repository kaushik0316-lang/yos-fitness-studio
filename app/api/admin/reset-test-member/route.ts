import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Temporary: clears the membership dates the deleted test receipts left on YF-2901.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== "yos-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const member = await prisma.member.findUnique({
    where: { memberId: "YF-2901" },
    select: { id: true, fullName: true, status: true, startDate: true, expiryDate: true, renewalDueDate: true, lastPaymentDate: true },
  });
  if (!member) return NextResponse.json({ error: "member not found" }, { status: 404 });

  const [payments, memberships] = await Promise.all([
    prisma.payment.count({ where: { memberId: member.id } }),
    prisma.membership.count({ where: { memberId: member.id } }),
  ]);
  if (payments > 0 || memberships > 0) {
    return NextResponse.json({ error: "refusing: member still has payments or memberships", payments, memberships }, { status: 409 });
  }

  const after = await prisma.member.update({
    where: { id: member.id },
    data: { startDate: null, expiryDate: null, renewalDueDate: null, lastPaymentDate: null },
    select: { memberId: true, fullName: true, status: true, startDate: true, expiryDate: true, renewalDueDate: true, lastPaymentDate: true },
  });
  return NextResponse.json({ before: member, after });
}
