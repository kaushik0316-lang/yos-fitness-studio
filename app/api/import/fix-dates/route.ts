import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Fix impossible years: 3036 → 2036 → closest logical year, etc.
function fixYear(date: Date): Date | null {
  const y = date.getUTCFullYear();
  if (y >= 2000 && y <= 2050) return null; // already fine

  // Century-swap: 3xxx → 2xxx (e.g. 3036 → 2036, 3015 → 2015)
  if (y >= 3000 && y < 4000) {
    const fixed = new Date(date);
    fixed.setUTCFullYear(y - 1000);
    return fixed;
  }
  // Two-digit century confusion: 2105 → 2025, 2115 → 2015
  if (y >= 2100 && y < 2200) {
    const fixed = new Date(date);
    const twoDigit = y - 2100; // e.g. 2105 → 5
    fixed.setUTCFullYear(2000 + twoDigit + (twoDigit < 10 ? 20 : 0));
    return fixed;
  }
  // 21xx with bigger numbers: just subtract 100
  if (y > 2050 && y < 3000) {
    const fixed = new Date(date);
    fixed.setUTCFullYear(y - 100);
    return fixed;
  }
  return null;
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payments = await prisma.payment.findMany({
    select: { id: true, memberId: true, date: true, startDate: true, expiryDate: true },
  });

  let paymentsFixed = 0;
  let errors = 0;
  const today = new Date();

  for (const p of payments) {
    const updates: Record<string, Date> = {};

    const fixedDate = p.date ? fixYear(p.date) : null;
    if (fixedDate) updates.date = fixedDate;

    const fixedStart = p.startDate ? fixYear(p.startDate) : null;
    if (fixedStart) updates.startDate = fixedStart;

    const fixedExpiry = p.expiryDate ? fixYear(p.expiryDate) : null;
    if (fixedExpiry) updates.expiryDate = fixedExpiry;

    if (Object.keys(updates).length === 0) continue;

    try {
      await prisma.payment.update({ where: { id: p.id }, data: updates });
      paymentsFixed++;
    } catch {
      errors++;
    }
  }

  // Re-sync member expiry dates from their latest fixed payment
  let membersFixed = 0;
  const members = await prisma.member.findMany({
    where: { expiryDate: { not: null } },
    select: { id: true, expiryDate: true },
  });

  for (const m of members) {
    if (!m.expiryDate) continue;
    const fixed = fixYear(m.expiryDate);
    if (!fixed) continue;
    const status = fixed >= today ? "ACTIVE" : "EXPIRED";
    try {
      await prisma.member.update({
        where: { id: m.id },
        data: { expiryDate: fixed, renewalDueDate: fixed, status },
      });
      membersFixed++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ paymentsFixed, membersFixed, errors, total: paymentsFixed + membersFixed });
}
