import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ONE-TIME FIX: Jhanavhi Sai Vn (YF-2903)
// Receipt #2283 shows General Fitness 12 Months 19/05/2025 → 18/05/2026
// System had wrong expiry of 18 Jun 2025 (1 month instead of 12).
// DELETE THIS FILE after running once.

export async function POST() {
  const member = await prisma.member.findUnique({
    where: { memberId: "YF-2903" },
    select: { id: true, fullName: true, expiryDate: true, status: true },
  });

  if (!member) {
    return NextResponse.json({ error: "Member YF-2903 not found" }, { status: 404 });
  }

  const correctExpiry = new Date("2026-05-18T23:59:59.000Z");

  const updated = await prisma.member.update({
    where: { id: member.id },
    data: { expiryDate: correctExpiry },
    select: { memberId: true, fullName: true, expiryDate: true, status: true },
  });

  return NextResponse.json({
    success: true,
    before: { expiryDate: member.expiryDate, status: member.status },
    after:  { expiryDate: updated.expiryDate, status: updated.status },
  });
}
