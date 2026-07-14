import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// One-time endpoint: reassign all payments + memberships from source members to target member.
// GET  → dry run (shows counts)
// POST → execute
// ADMIN only. Remove this file after use.

const SOURCE_IDS = ["IMP-63", "IMP-668"];
const TARGET_ID  = "YF-2073";

async function getActors() {
  const [sources, target] = await Promise.all([
    prisma.member.findMany({
      where: { memberId: { in: SOURCE_IDS } },
      select: {
        id: true, memberId: true, fullName: true,
        _count: { select: { payments: true, memberships: true } },
      },
    }),
    prisma.member.findUnique({
      where: { memberId: TARGET_ID },
      select: { id: true, memberId: true, fullName: true, expiryDate: true, lastPaymentDate: true },
    }),
  ]);
  return { sources, target };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sources, target } = await getActors();
  if (!target) return NextResponse.json({ error: "Target member not found" }, { status: 404 });

  return NextResponse.json({
    dryRun: true,
    target: { memberId: target.memberId, fullName: target.fullName },
    sources: sources.map((s) => ({
      memberId: s.memberId,
      fullName: s.fullName,
      payments: s._count.payments,
      memberships: s._count.memberships,
    })),
    action: "All payments and memberships from sources will be reassigned to target. Source members will be set to INACTIVE.",
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sources, target } = await getActors();
  if (!target) return NextResponse.json({ error: "Target member not found" }, { status: 404 });
  if (!sources.length) return NextResponse.json({ error: "No source members found" }, { status: 404 });

  const sourceInternalIds = sources.map((s) => s.id);

  const result = await prisma.$transaction(async (tx) => {
    // Reassign payments
    const updatedPayments = await tx.payment.updateMany({
      where: { memberId: { in: sourceInternalIds } },
      data:  { memberId: target.id },
    });

    // Reassign memberships
    const updatedMemberships = await tx.membership.updateMany({
      where: { memberId: { in: sourceInternalIds } },
      data:  { memberId: target.id },
    });

    // Recalculate target's snapshot from their now-merged payments/memberships
    const latestPayment = await tx.payment.findFirst({
      where: { memberId: target.id, isVoided: false },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    const latestMembership = await tx.membership.findFirst({
      where: { memberId: target.id },
      orderBy: { expiryDate: "desc" },
      select: { expiryDate: true, packageId: true, startDate: true },
    });

    if (latestMembership) {
      await tx.member.update({
        where: { id: target.id },
        data: {
          expiryDate:      latestMembership.expiryDate,
          renewalDueDate:  latestMembership.expiryDate,
          startDate:       latestMembership.startDate,
          currentPackageId: latestMembership.packageId,
          lastPaymentDate: latestPayment?.date ?? undefined,
          status:          "ACTIVE",
        },
      });
    }

    // Mark source members INACTIVE
    await tx.member.updateMany({
      where: { id: { in: sourceInternalIds } },
      data:  { status: "INACTIVE" },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        userId:   session.user.id,
        action:   "UPDATE",
        entity:   "Member",
        entityId: target.id,
        newValues: {
          _action: "bulk-reassign",
          fromMembers: sources.map((s) => s.memberId),
          toMember:    target.memberId,
          paymentsReassigned:    updatedPayments.count,
          membershipsReassigned: updatedMemberships.count,
        } as any,
      },
    });

    return {
      paymentsReassigned:    updatedPayments.count,
      membershipsReassigned: updatedMemberships.count,
    };
  });

  return NextResponse.json({
    success: true,
    target: { memberId: target.memberId, fullName: target.fullName },
    ...result,
    note: "Source members set to INACTIVE. Remove this endpoint file now.",
  });
}
