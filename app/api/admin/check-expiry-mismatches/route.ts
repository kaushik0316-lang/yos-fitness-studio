import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Find members whose expiryDate is less than their latest General Fitness membership expiry
// (caused by PT renewals overwriting the General membership expiry)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all memberships joined with package names
  const memberships = await prisma.membership.findMany({
    include: {
      package: { select: { name: true } },
      member: { select: { id: true, memberId: true, fullName: true, expiryDate: true, status: true } },
    },
    orderBy: { expiryDate: "desc" },
  });

  // Group by member, find their latest General Fitness expiry
  const memberMap: Record<string, {
    memberId: string; fullName: string; memberExpiry: Date | null; status: string;
    latestGFExpiry: Date | null; latestGFStart: Date | null; latestGFPackage: string | null;
    latestPTExpiry: Date | null; latestPTPackage: string | null;
  }> = {};

  for (const ms of memberships) {
    const m = ms.member;
    if (!memberMap[m.id]) {
      memberMap[m.id] = {
        memberId: m.memberId, fullName: m.fullName,
        memberExpiry: m.expiryDate, status: m.status,
        latestGFExpiry: null, latestGFStart: null, latestGFPackage: null,
        latestPTExpiry: null, latestPTPackage: null,
      };
    }
    const entry = memberMap[m.id];
    const pkgName = ms.package?.name ?? "";
    const isPT = /pt|personal\s*train|semi\s*private/i.test(pkgName);

    if (!isPT && (!entry.latestGFExpiry || ms.expiryDate > entry.latestGFExpiry)) {
      entry.latestGFExpiry = ms.expiryDate;
      entry.latestGFStart = ms.startDate;
      entry.latestGFPackage = pkgName;
    }
    if (isPT && (!entry.latestPTExpiry || ms.expiryDate > entry.latestPTExpiry)) {
      entry.latestPTExpiry = ms.expiryDate;
      entry.latestPTPackage = pkgName;
    }
  }

  // Find mismatches: member has a GF expiry that's later than their current memberExpiry
  const mismatches = Object.values(memberMap).filter((e) => {
    if (!e.latestGFExpiry || !e.memberExpiry) return false;
    // Mismatch if GF expiry is more than 1 day later than member's current expiry
    return e.latestGFExpiry.getTime() - e.memberExpiry.getTime() > 24 * 60 * 60 * 1000;
  }).map((e) => ({
    memberId: e.memberId,
    fullName: e.fullName,
    status: e.status,
    currentExpiry: e.memberExpiry?.toISOString().split("T")[0],
    correctExpiry: e.latestGFExpiry?.toISOString().split("T")[0],
    gfPackage: e.latestGFPackage,
    gfStart: e.latestGFStart?.toISOString().split("T")[0],
    latestPTPackage: e.latestPTPackage,
    latestPTExpiry: e.latestPTExpiry?.toISOString().split("T")[0],
    daysDiff: Math.round(((e.latestGFExpiry?.getTime() ?? 0) - (e.memberExpiry?.getTime() ?? 0)) / (1000 * 60 * 60 * 24)),
  })).sort((a, b) => b.daysDiff - a.daysDiff);

  return NextResponse.json({ count: mismatches.length, mismatches });
}
