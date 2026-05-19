import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Corrects an obviously-wrong year to the nearest plausible year in 2005-2027.
 *
 * Rules applied in order:
 *  1. Subtract 1000 while year ≥ 3000  (e.g. 3036 → 2036, 3015 → 2015)
 *  2. Subtract 100  while year ≥ 2100  (e.g. 2105 → 2005)
 *  3. Subtract 10   while year > 2027  (e.g. 2036 → 2026)
 *  4. Add 20 if year < 2005            (e.g. 2005 → 2025 for the 21xx family)
 */
function correctYear(d: Date): Date {
  let y = d.getFullYear();

  while (y >= 3000) y -= 1000;
  while (y >= 2100) y -= 100;
  while (y > 2027)  y -= 10;
  if (y < 2005)     y += 20;

  const fixed = new Date(d);
  fixed.setFullYear(y);
  return fixed;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all payments where the date year is clearly wrong (> 2027)
  const badPayments = await prisma.payment.findMany({
    where: {
      date: { gt: new Date("2027-12-31") },
    },
    select: { id: true, date: true, startDate: true, expiryDate: true },
  });

  let fixed = 0, errors = 0;

  for (const p of badPayments) {
    try {
      const data: any = {
        date: correctYear(p.date),
      };
      // Also fix startDate / expiryDate if they are similarly broken
      if (p.startDate && p.startDate.getFullYear() > 2027) {
        data.startDate = correctYear(p.startDate);
      }
      if (p.expiryDate && p.expiryDate.getFullYear() > 2027) {
        data.expiryDate = correctYear(p.expiryDate);
      }

      await prisma.payment.update({ where: { id: p.id }, data });
      fixed++;
    } catch {
      errors++;
    }
  }

  // Also fix member.expiryDate if it's in the wrong century
  const badMembers = await prisma.member.findMany({
    where: { expiryDate: { gt: new Date("2027-12-31") } },
    select: { id: true, expiryDate: true },
  });

  let membersFixed = 0;
  for (const m of badMembers) {
    if (!m.expiryDate) continue;
    try {
      await prisma.member.update({
        where: { id: m.id },
        data: { expiryDate: correctYear(m.expiryDate) },
      });
      membersFixed++;
    } catch { errors++; }
  }

  return NextResponse.json({
    paymentsFixed: fixed,
    membersFixed,
    errors,
    total: badPayments.length,
  });
}
