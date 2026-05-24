import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results: string[] = [];

  // Fix Nithin #2678: date + startDate → 21 May 2026, expiryDate → 20 May 2027
  const nithin = await prisma.payment.findFirst({
    where: { receiptNumber: 2678 },
    select: { id: true, memberId: true },
  });
  if (nithin) {
    const newStart  = new Date("2026-05-21T00:00:00.000Z");
    const newExpiry = new Date("2027-05-20T00:00:00.000Z");
    await prisma.payment.update({
      where: { id: nithin.id },
      data: { date: newStart, startDate: newStart, expiryDate: newExpiry },
    });
    await prisma.member.update({
      where: { id: nithin.memberId },
      data: {
        startDate: newStart,
        expiryDate: newExpiry,
        renewalDueDate: newExpiry,
        status: "ACTIVE",
      },
    });
    results.push("✓ Nithin #2678: date/start → 21 May 2026, expiry → 20 May 2027");
  } else {
    results.push("✗ Nithin #2678: not found");
  }

  // Fix Gowtham #2656: date only → 29 Apr 2026
  const gowtham = await prisma.payment.findFirst({
    where: { receiptNumber: 2656 },
    select: { id: true },
  });
  if (gowtham) {
    await prisma.payment.update({
      where: { id: gowtham.id },
      data: { date: new Date("2026-04-29T00:00:00.000Z") },
    });
    results.push("✓ Gowtham #2656: date → 29 Apr 2026");
  } else {
    results.push("✗ Gowtham #2656: not found");
  }

  return NextResponse.json({ results });
}
