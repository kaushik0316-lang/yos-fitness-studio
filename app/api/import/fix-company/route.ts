import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/import/fix-company
 * Updates each member's primaryCompany to match their most recent payment's company.
 * Members with no payments are left unchanged.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get each member's most recent payment company
  const latestPayments = await prisma.payment.findMany({
    where: { receiptNumber: { not: null } },
    select: { memberId: true, company: true, date: true },
    orderBy: { date: "desc" },
  });

  // Build map: memberId → most recent company
  const memberCompany: Record<string, string> = {};
  for (const p of latestPayments) {
    if (!memberCompany[p.memberId]) {
      memberCompany[p.memberId] = p.company; // first one is most recent (ordered desc)
    }
  }

  let updatedFitness = 0, updatedStudio = 0;

  // Update in batches
  for (const [memberId, company] of Object.entries(memberCompany)) {
    await prisma.member.update({
      where: { id: memberId },
      data: { primaryCompany: company as any },
    });
    if (company === "YOS_FITNESS") updatedFitness++;
    else updatedStudio++;
  }

  return NextResponse.json({
    updatedFitness,
    updatedStudio,
    total: updatedFitness + updatedStudio,
  });
}
