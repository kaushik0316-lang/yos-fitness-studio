import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find payments where date is 30+ days AFTER startDate — these defaulted to import timestamp
  const payments = await prisma.payment.findMany({
    where: {
      startDate: { not: null },
      date: { not: undefined },
    },
    select: { id: true, date: true, startDate: true, memberId: true, expiryDate: true },
  });

  const toFix = payments.filter((p) => {
    if (!p.startDate) return false;
    const diffDays = (p.date.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 30;
  });

  let fixed = 0;
  let ghostJoinFixed = 0;

  for (const p of toFix) {
    await prisma.payment.update({
      where: { id: p.id },
      data: { date: p.startDate! },
    });

    // Also fix member joinDate if it's the same inflated timestamp
    const member = await prisma.member.findUnique({
      where: { id: p.memberId },
      select: { id: true, joinDate: true },
    });
    if (member && p.startDate) {
      const joinDiff = (member.joinDate.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (joinDiff > 30) {
        await prisma.member.update({
          where: { id: member.id },
          data: { joinDate: p.startDate },
        });
        ghostJoinFixed++;
      }
    }
    fixed++;
  }

  // Re-sync member statuses from their latest payment expiry
  const today = new Date();
  let setActive = 0;
  let setExpired = 0;

  const affectedMemberIds = Array.from(new Set(toFix.map((p) => p.memberId)));
  for (const memberId of affectedMemberIds) {
    const latest = await prisma.payment.findFirst({
      where: { memberId, expiryDate: { not: null } },
      orderBy: { expiryDate: "desc" },
      select: { expiryDate: true },
    });
    if (!latest?.expiryDate) continue;
    const status = latest.expiryDate >= today ? "ACTIVE" : "EXPIRED";
    await prisma.member.update({
      where: { id: memberId },
      data: { status, expiryDate: latest.expiryDate, renewalDueDate: latest.expiryDate },
    });
    if (status === "ACTIVE") setActive++; else setExpired++;
  }

  return NextResponse.json({ fixed, ghostJoinFixed, setActive, setExpired });
}
