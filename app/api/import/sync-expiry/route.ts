import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/import/sync-expiry
 * No file needed — reads expiryDate from existing Payment records and
 * writes status + expiryDate back to each Member record.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();

  // Exclude ghost members (groupBy doesn't support relation filters)
  const ghostMembers = await prisma.member.findMany({
    where: { memberId: { startsWith: "IMP-" } },
    select: { id: true },
  });
  const ghostIds = ghostMembers.map((g) => g.id);

  // Find each real member's latest payment expiryDate across ALL companies
  const memberLatestExpiry = await prisma.payment.groupBy({
    by: ["memberId"],
    where: {
      expiryDate: { not: null },
      ...(ghostIds.length > 0 ? { memberId: { notIn: ghostIds } } : {}),
    },
    _max: { expiryDate: true },
  });

  let setActive = 0, setExpired = 0, errors = 0;

  for (const row of memberLatestExpiry) {
    const expiry = row._max.expiryDate;
    if (!expiry) continue;

    const newStatus = expiry >= today ? "ACTIVE" : "EXPIRED";

    try {
      await prisma.member.update({
        where: { id: row.memberId },
        data: { status: newStatus, expiryDate: expiry },
      });
      if (newStatus === "ACTIVE") setActive++;
      else setExpired++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    membersProcessed: memberLatestExpiry.length,
    setActive,
    setExpired,
    errors,
  });
}
