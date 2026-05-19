import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time cleanup endpoint — delete after use
const SECRET = "yos-clear-2026-x9k2";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-secret");
  if (auth !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.membership.deleteMany();
  const payments = await prisma.payment.deleteMany();
  const members = await prisma.member.updateMany({
    data: {
      currentPackageId: null,
      startDate: null,
      expiryDate: null,
      renewalDueDate: null,
      lastPaymentDate: null,
    },
  });

  return NextResponse.json({
    ok: true,
    membershipsDeleted: memberships.count,
    paymentsDeleted: payments.count,
    membersReset: members.count,
  });
}
