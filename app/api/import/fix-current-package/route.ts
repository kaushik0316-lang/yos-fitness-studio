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

  // Find all members with no currentPackageId but with an expiryDate set
  // (expiryDate was set by the original run-full import or status syncs)
  const membersToFix = await prisma.member.findMany({
    where: {
      currentPackageId: null,
      expiryDate: { not: null },
    },
    select: { id: true, expiryDate: true },
  });

  if (membersToFix.length === 0) {
    // Also count members with currentPackageId=null but no expiryDate
    const noExpiry = await prisma.member.count({ where: { currentPackageId: null } });
    return NextResponse.json({ fixed: 0, noPackageFound: noExpiry });
  }

  const memberIds = membersToFix.map((m) => m.id);

  // Build a lookup: memberId → { expiryDate }
  const memberMap = new Map(
    membersToFix.map((m) => [m.id, { expiryDate: m.expiryDate! }])
  );

  // Get the most recent payment date for each of these members
  // (payment.date = actual receipt date; payment with latest date ≈ start of current membership)
  const recentPayments = await prisma.payment.findMany({
    where: { memberId: { in: memberIds } },
    select: { memberId: true, date: true, company: true },
    orderBy: { date: "desc" },
  });

  // Keep only the most-recent payment per member
  const latestPayment = new Map<string, { date: Date; company: string }>();
  for (const p of recentPayments) {
    if (!latestPayment.has(p.memberId)) {
      latestPayment.set(p.memberId, { date: p.date, company: p.company });
    }
  }

  // For each member, calculate duration and find a matching package
  const updates: { memberId: string; packageId: string }[] = [];
  let noPackageFound = 0;

  for (const [memberId, { expiryDate }] of Array.from(memberMap.entries())) {
    const latest = latestPayment.get(memberId);
    if (!latest) { noPackageFound++; continue; }

    // duration = days from last payment date to expiry date
    const durationDays = Math.round(
      (expiryDate.getTime() - latest.date.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Skip nonsensical durations (negative or > 2 years)
    if (durationDays < 0 || durationDays > 730) { noPackageFound++; continue; }

    // Find packages: match by duration (±10 days tolerance) and payment company
    const paymentCompany = latest.company as string;
    const candidates = allPackages.filter((pkg) => {
      const durationMatch = Math.abs(pkg.durationDays - durationDays) <= 10;
      const companyMatch =
        pkg.company === null ||
        pkg.company === paymentCompany;
      return durationMatch && companyMatch;
    });

    if (candidates.length === 0) { noPackageFound++; continue; }

    // Prefer: exact payment company match > null (both)
    const exact = candidates.filter((pkg) => pkg.company === paymentCompany);
    const chosen = exact.length > 0 ? exact[0] : candidates[0];

    updates.push({ memberId, packageId: chosen.id });
  }

  // Also count members with no expiryDate at all (truly unresolvable)
  const totalNoPackage = await prisma.member.count({
    where: { currentPackageId: null },
  });
  noPackageFound += totalNoPackage - membersToFix.length;

  // Batch-update in chunks of 50
  let fixed = 0;
  for (let i = 0; i < updates.length; i += 50) {
    await Promise.all(
      updates.slice(i, i + 50).map(({ memberId, packageId }) =>
        prisma.member.update({
          where: { id: memberId },
          data: { currentPackageId: packageId },
        })
      )
    );
    fixed += Math.min(50, updates.length - i);
  }

  return NextResponse.json({ fixed, noPackageFound });
}
