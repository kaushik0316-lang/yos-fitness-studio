import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ONE-TIME FIX: T Vigneshwar (YF-2728) — yearly package #2468 (01 Feb 2026 → 31 Jan 2027)
// was overwritten by subsequent monthly ₹1,200 renewals. Fix sets correct expiry.
// DELETE THIS FILE after running once.

export async function POST() {
  const member = await prisma.member.findUnique({
    where: { memberId: "YF-2728" },
    select: { id: true, fullName: true, expiryDate: true, status: true },
  });

  if (!member) {
    return NextResponse.json({ error: "Member YF-2728 not found" }, { status: 404 });
  }

  const correctExpiry = new Date("2027-01-31T23:59:59.000Z");

  const updated = await prisma.member.update({
    where: { id: member.id },
    data: {
      expiryDate: correctExpiry,
      status: "ACTIVE",
    },
    select: { memberId: true, fullName: true, expiryDate: true, status: true },
  });

  return NextResponse.json({
    success: true,
    before: { expiryDate: member.expiryDate, status: member.status },
    after: { expiryDate: updated.expiryDate, status: updated.status },
  });
}
