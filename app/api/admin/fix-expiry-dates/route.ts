import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// One-time admin utility: backfill null expiryDate on members from their
// most recent non-voided payment that has an expiryDate set.
// Only accessible by ADMIN role.

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }

    // Find all members with null expiryDate
    const members = await prisma.member.findMany({
      where: { expiryDate: null },
      select: { id: true, memberId: true, fullName: true },
    });

    let updated = 0;
    let skipped = 0;
    const details: string[] = [];

    for (const member of members) {
      // Find most recent non-voided payment with an expiryDate
      const payment = await prisma.payment.findFirst({
        where: {
          memberId: member.id,
          isVoided: false,
          expiryDate: { not: null },
        },
        orderBy: { date: "desc" },
        select: {
          expiryDate: true,
          startDate: true,
          packageId: true,
          date: true,
        },
      });

      if (!payment?.expiryDate) {
        skipped++;
        continue;
      }

      await prisma.member.update({
        where: { id: member.id },
        data: {
          expiryDate:      payment.expiryDate,
          startDate:       payment.startDate ?? undefined,
          currentPackageId: payment.packageId ?? undefined,
          lastPaymentDate: payment.date,
          renewalDueDate:  payment.expiryDate,
        },
      });

      updated++;
      details.push(`${member.memberId} ${member.fullName} → ${payment.expiryDate.toISOString().slice(0, 10)}`);
    }

    return NextResponse.json({
      ok: true,
      totalNullExpiry: members.length,
      updated,
      skipped, // members with no valid payment at all (no fix possible)
      details,
    });
  } catch (err) {
    console.error("[fix-expiry-dates]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
