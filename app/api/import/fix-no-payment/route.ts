import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/import/fix-no-payment
 * Finds all non-ghost members with no payment records and sets them to PROSPECT.
 * These are members who filled an application form but never paid — they should
 * not show as ACTIVE.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find member IDs that have at least one payment
  const membersWithPayments = await prisma.payment.findMany({
    select: { memberId: true },
    distinct: ["memberId"],
  });
  const paidIds = new Set(membersWithPayments.map((p) => p.memberId));

  // Update all non-ghost ACTIVE members with no payments → PROSPECT
  const result = await prisma.member.updateMany({
    where: {
      memberId: { not: { startsWith: "IMP-" } },
      status: "ACTIVE",
      expiryDate: null,
      id: { notIn: [...paidIds] },
    },
    data: { status: "PROSPECT" },
  });

  return NextResponse.json({ updated: result.count });
}
