import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load all packages for duration matching
  const allPackages = await prisma.package.findMany({
    select: { id: true, durationDays: true, company: true, name: true },
  });

  // Find all members with no currentPackageId
  const membersToFix = await prisma.member.findMany({
    where: { currentPackageId: null },
    select: { id: true },
  });
  const memberIds = membersToFix.map((m) => m.id);

  if (memberIds.length === 0) {
    return NextResponse.json({ fixed: 0, noPackageFound: 0 });
  }

  // ── Strategy 1: payment already has packageId (future-proof) ──────────────
  const paymentsWithPkg = await prisma.payment.findMany({
    where: { memberId: { in: memberIds }, packageId: { not: null } },
    select: { memberId: true, packageId: true, startDate: true, date: true },
    orderBy: { date: "desc" },
  });

  const bestByPkgId = new Map<string, { packageId: string; startDate: Date | null }>();
  for (const p of paymentsWithPkg) {
    if (!bestByPkgId.has(p.memberId)) {
      bestByPkgId.set(p.memberId, { packageId: p.packageId!, startDate: p.startDate });
    }
  }

  // ── Strategy 2: duration match using payment startDate + expiryDate ────────
  // (set by the Backfill step which reads START/END columns from Excel)
  const paymentsWithDates = await prisma.payment.findMany({
    where: {
      memberId: { in: memberIds },
      packageId: null,
      startDate: { not: null },
      expiryDate: { not: null },
    },
    select: {
      memberId: true,
      startDate: true,
      expiryDate: true,
      company: true,
      date: true,
    },
    orderBy: { date: "desc" },
  });

  // Keep only the most-recent payment per member for duration matching
  const bestByDuration = new Map<
    string,
    { packageId: string; startDate: Date | null } | null
  >();

  for (const p of paymentsWithDates) {
    if (bestByDuration.has(p.memberId) || bestByPkgId.has(p.memberId)) continue;

    const durationDays = Math.round(
      (p.expiryDate!.getTime() - p.startDate!.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Find packages matching company + duration (±5 days tolerance)
    const candidates = allPackages.filter((pkg) => {
      const durationMatch = Math.abs(pkg.durationDays - durationDays) <= 5;
      const companyMatch = pkg.company === null || pkg.company === p.company;
      return durationMatch && companyMatch;
    });

    if (candidates.length === 0) {
      bestByDuration.set(p.memberId, null); // no match
      continue;
    }

    // Prefer exact company match over null/"BOTH" company packages
    // (e.g. "1 Month - Yos Fitness" over "Personal Training - Monthly" for a YF payment)
    const exactCompany = candidates.filter((pkg) => pkg.company === p.company);
    const chosen = exactCompany.length > 0 ? exactCompany[0] : candidates[0];

    bestByDuration.set(p.memberId, { packageId: chosen.id, startDate: p.startDate });
  }

  // ── Merge both strategies and update members ───────────────────────────────
  const merged = new Map<string, { packageId: string; startDate: Date | null }>();
  for (const [id, val] of bestByPkgId) merged.set(id, val);
  for (const [id, val] of bestByDuration) {
    if (!merged.has(id) && val !== null) merged.set(id, val);
  }

  let fixed = 0;
  const updates = Array.from(merged.entries());

  for (let i = 0; i < updates.length; i += 50) {
    await Promise.all(
      updates.slice(i, i + 50).map(([memberId, { packageId, startDate }]) =>
        prisma.member.update({
          where: { id: memberId },
          data: {
            currentPackageId: packageId,
            ...(startDate ? { startDate } : {}),
          },
        })
      )
    );
    fixed += Math.min(50, updates.length - i);
  }

  const noPackageFound = memberIds.length - fixed;

  return NextResponse.json({ fixed, noPackageFound });
}
