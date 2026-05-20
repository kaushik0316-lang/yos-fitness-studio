import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all members with no currentPackageId
  const membersToFix = await prisma.member.findMany({
    where: { currentPackageId: null },
    select: { id: true },
  });

  const memberIds = membersToFix.map((m) => m.id);

  if (memberIds.length === 0) {
    return NextResponse.json({ fixed: 0, noPackageFound: 0 });
  }

  // Fetch all payments with a packageId for these members, newest-first
  // We only need one per member — the most recent one with a package linked
  const payments = await prisma.payment.findMany({
    where: {
      memberId: { in: memberIds },
      packageId: { not: null },
    },
    select: {
      memberId: true,
      packageId: true,
      startDate: true,
      date: true,
    },
    orderBy: { date: "desc" },
  });

  // Keep only the most-recent payment per member
  const bestPayment = new Map<string, (typeof payments)[0]>();
  for (const p of payments) {
    if (!bestPayment.has(p.memberId)) bestPayment.set(p.memberId, p);
  }

  // Batch-update in chunks of 50
  let fixed = 0;
  const updates = Array.from(bestPayment.entries());

  for (let i = 0; i < updates.length; i += 50) {
    await Promise.all(
      updates.slice(i, i + 50).map(([memberId, p]) =>
        prisma.member.update({
          where: { id: memberId },
          data: {
            currentPackageId: p.packageId!,
            ...(p.startDate ? { startDate: p.startDate } : {}),
          },
        })
      )
    );
    fixed += Math.min(50, updates.length - i);
  }

  const noPackageFound = memberIds.length - fixed;

  return NextResponse.json({ fixed, noPackageFound });
}
