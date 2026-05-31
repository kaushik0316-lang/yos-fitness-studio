import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { paymentId, newMemberId } = await req.json();
    if (!paymentId || !newMemberId)
      return NextResponse.json({ error: "paymentId and newMemberId are required" }, { status: 400 });

    const [payment, newMember] = await Promise.all([
      prisma.payment.findUnique({
        where: { id: paymentId },
        include: { member: { select: { id: true, fullName: true, memberId: true } }, membership: true },
      }),
      prisma.member.findUnique({
        where: { id: newMemberId },
        select: { id: true, fullName: true, memberId: true },
      }),
    ]);

    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (!newMember) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    if (payment.memberId === newMemberId)
      return NextResponse.json({ error: "Already assigned to this member" }, { status: 400 });

    // Check if destination member already has an active membership that would conflict
    if (payment.membership) {
      const conflicting = await prisma.membership.findFirst({
        where: {
          memberId: newMemberId,
          expiryDate: { gt: new Date() },
        },
      });
      if (conflicting) {
        return NextResponse.json({
          error: "Target member already has an active membership. Reassigning would create overlapping memberships. Resolve the existing membership first.",
        }, { status: 409 });
      }
    }

    const oldMember = payment.member;

    await prisma.$transaction(async (tx) => {
      // Reassign the payment
      await tx.payment.update({
        where: { id: paymentId },
        data: { memberId: newMemberId },
      });

      // Reassign the linked membership if one exists
      if (payment.membership) {
        await tx.membership.update({
          where: { id: payment.membership.id },
          data: { memberId: newMemberId },
        });

        // Update new member's current package, expiry, etc.
        await tx.member.update({
          where: { id: newMemberId },
          data: {
            currentPackageId: payment.membership.packageId,
            startDate: payment.membership.startDate,
            expiryDate: payment.membership.expiryDate,
            renewalDueDate: payment.membership.expiryDate,
            status: "ACTIVE",
          },
        });

        // Reset old member — check if they have any remaining active memberships
        const oldMemberActiveMemberships = await tx.membership.count({
          where: { memberId: oldMember.id },
        });
        if (oldMemberActiveMemberships === 0) {
          await tx.member.update({
            where: { id: oldMember.id },
            data: {
              currentPackageId: null,
              expiryDate: null,
              renewalDueDate: null,
              status: "EXPIRED",
            },
          });
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE",
          entity: "Payment",
          entityId: paymentId,
          oldValues: { memberId: oldMember.id, memberName: oldMember.fullName, memberId2: oldMember.memberId } as any,
          newValues: { memberId: newMember.id, memberName: newMember.fullName, memberId2: newMember.memberId } as any,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      from: { name: oldMember.fullName, memberId: oldMember.memberId },
      to: { name: newMember.fullName, memberId: newMember.memberId },
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
