import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Move membership (and optionally payment) from one member to another
// Used when there's no payment record (imported members)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fromMemberId, toMemberId } = await req.json();
  if (!fromMemberId || !toMemberId)
    return NextResponse.json({ error: "fromMemberId and toMemberId required" }, { status: 400 });

  const [from, to] = await Promise.all([
    prisma.member.findUnique({
      where: { id: fromMemberId },
      include: { memberships: { orderBy: { startDate: "desc" }, take: 1 } },
    }),
    prisma.member.findUnique({ where: { id: toMemberId }, select: { id: true, fullName: true, memberId: true } }),
  ]);

  if (!from) return NextResponse.json({ error: "Source member not found" }, { status: 404 });
  if (!to)   return NextResponse.json({ error: "Target member not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Move memberships
    await tx.membership.updateMany({ where: { memberId: fromMemberId }, data: { memberId: toMemberId } });

    // Activate target member with source's membership data
    await tx.member.update({
      where: { id: toMemberId },
      data: {
        currentPackageId: from.currentPackageId,
        startDate:        from.startDate,
        expiryDate:       from.expiryDate,
        renewalDueDate:   from.expiryDate,
        status:           "ACTIVE",
      },
    });

    // Expire source member
    await tx.member.update({
      where: { id: fromMemberId },
      data: { currentPackageId: null, expiryDate: null, renewalDueDate: null, status: "EXPIRED" },
    });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "Membership",
        entityId: fromMemberId,
        oldValues: { memberId: fromMemberId, memberName: from.fullName } as any,
        newValues: { memberId: toMemberId, memberName: to.fullName } as any,
      },
    });
  });

  return NextResponse.json({ ok: true, from: from.fullName, to: to.fullName });
}
