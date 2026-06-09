import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Admin utility: fix member expiryDate and status from payment records.
// - Members with null expiryDate → backfill from most recent non-voided payment
// - Members with status EXPIRED but a future expiryDate in payments → set ACTIVE
// Only accessible by ADMIN role. Safe to run multiple times.

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }

    const now = new Date();

    // ── Pass 1: Fix null expiryDate ──────────────────────────────────────────
    const nullExpiryMembers = await prisma.member.findMany({
      where: { expiryDate: null },
      select: { id: true, memberId: true, fullName: true, status: true },
    });

    let expiryFixed = 0;
    let expirySkipped = 0;

    for (const member of nullExpiryMembers) {
      const payment = await prisma.payment.findFirst({
        where: { memberId: member.id, isVoided: false, expiryDate: { not: null } },
        orderBy: { date: "desc" },
        select: { expiryDate: true, startDate: true, packageId: true, date: true },
      });

      if (!payment?.expiryDate) { expirySkipped++; continue; }

      const newStatus = payment.expiryDate > now ? "ACTIVE" : member.status;

      await prisma.member.update({
        where: { id: member.id },
        data: {
          expiryDate:       payment.expiryDate,
          startDate:        payment.startDate ?? undefined,
          currentPackageId: payment.packageId ?? undefined,
          lastPaymentDate:  payment.date,
          renewalDueDate:   payment.expiryDate,
          status:           newStatus as any,
        },
      });
      expiryFixed++;
    }

    // ── Pass 2: Fix EXPIRED status where payment says still active ──────────
    const wronglyExpired = await prisma.member.findMany({
      where: { status: "EXPIRED" },
      select: { id: true, memberId: true, fullName: true, expiryDate: true },
    });

    let statusFixed = 0;
    const statusDetails: string[] = [];

    for (const member of wronglyExpired) {
      // Find most recent non-voided payment with a future expiryDate
      const payment = await prisma.payment.findFirst({
        where: { memberId: member.id, isVoided: false, expiryDate: { gt: now } },
        orderBy: { expiryDate: "desc" },
        select: { expiryDate: true, startDate: true, packageId: true, date: true },
      });

      if (!payment?.expiryDate) continue;

      await prisma.member.update({
        where: { id: member.id },
        data: {
          status:           "ACTIVE" as any,
          expiryDate:       payment.expiryDate,
          startDate:        payment.startDate ?? undefined,
          currentPackageId: payment.packageId ?? undefined,
          lastPaymentDate:  payment.date,
          renewalDueDate:   payment.expiryDate,
        },
      });

      statusFixed++;
      statusDetails.push(
        `${member.memberId} ${member.fullName}: EXPIRED → ACTIVE (expires ${payment.expiryDate.toISOString().slice(0, 10)})`
      );
    }

    return NextResponse.json({
      ok: true,
      expiryFixed,
      expirySkipped,
      statusFixed,
      statusDetails,
      message: `Fixed ${expiryFixed} null expiry dates, restored ${statusFixed} members from EXPIRED → ACTIVE.`,
    });
  } catch (err) {
    console.error("[fix-expiry-dates]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
