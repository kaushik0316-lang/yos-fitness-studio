import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find ALL payments where date is suspiciously later than startDate.
  // A receipt date should be on or close to when the membership starts —
  // if date is 30+ days AFTER startDate the receipt date is wrong
  // (it defaulted to the import timestamp because the Excel cell was a text string).
  const payments = await prisma.payment.findMany({
    where: { startDate: { not: null } },
    select: { id: true, date: true, startDate: true },
  });

  const THRESHOLD_DAYS = 30;
  const toFix = payments.filter((p) => {
    const diffMs = p.date.getTime() - p.startDate!.getTime();
    return diffMs > THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  });

  // Batch-update in parallel chunks of 50
  let fixed = 0;
  for (let i = 0; i < toFix.length; i += 50) {
    await Promise.all(
      toFix.slice(i, i + 50).map((p) =>
        prisma.payment.update({
          where: { id: p.id },
          data: { date: p.startDate! },
        })
      )
    );
    fixed += Math.min(50, toFix.length - i);
  }

  // Set each ghost's joinDate from their earliest payment date (real first-visit date)
  // Falls back to 1970-01-01 for ghosts with no payments so they sort to the bottom
  const ghostsWithEarliestPayment = await prisma.payment.groupBy({
    by: ["memberId"],
    where: { member: { memberId: { startsWith: "IMP-" } } },
    _min: { date: true },
  });

  let ghostJoinFixed = 0;
  // Update ghosts that have payments — use earliest payment date as joinDate
  for (let i = 0; i < ghostsWithEarliestPayment.length; i += 50) {
    await Promise.all(
      ghostsWithEarliestPayment.slice(i, i + 50).map((g) =>
        g._min.date
          ? prisma.member.update({
              where: { id: g.memberId },
              data: { joinDate: g._min.date },
            })
          : Promise.resolve()
      )
    );
    ghostJoinFixed += ghostsWithEarliestPayment.slice(i, i + 50).filter((g) => g._min.date).length;
  }

  // Ghosts with no payments at all → push to 1970 so they sort below everything
  const ghostJoinFix = await prisma.member.updateMany({
    where: {
      memberId: { startsWith: "IMP-" },
      payments: { none: {} },
    },
    data: { joinDate: new Date("1970-01-01") },
  });

  // Re-sync member status + expiryDate now that dates are corrected
  const today = new Date();
  const ghosts = await prisma.member.findMany({
    where: { memberId: { startsWith: "IMP-" } },
    select: { id: true },
  });
  const ghostIds = ghosts.map((g) => g.id);

  const latestExpiry = await prisma.payment.groupBy({
    by: ["memberId"],
    where: {
      expiryDate: { not: null },
      ...(ghostIds.length > 0 ? { memberId: { notIn: ghostIds } } : {}),
    },
    _max: { expiryDate: true },
  });

  let setActive = 0, setExpired = 0;
  const syncOps = latestExpiry
    .filter((r) => r._max.expiryDate != null)
    .map((r) => {
      const exp = r._max.expiryDate!;
      const status = exp >= today ? "ACTIVE" : "EXPIRED";
      if (status === "ACTIVE") setActive++; else setExpired++;
      return prisma.member.update({
        where: { id: r.memberId },
        data: { status, expiryDate: exp },
      });
    });

  for (let i = 0; i < syncOps.length; i += 50) {
    await Promise.all(syncOps.slice(i, i + 50));
  }

  return NextResponse.json({ fixed, ghostJoinFixed: ghostJoinFixed + ghostJoinFix.count, setActive, setExpired });
}
