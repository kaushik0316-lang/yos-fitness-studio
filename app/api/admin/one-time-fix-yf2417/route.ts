import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// One-time fix: restore YF-2417 (Bharadhwaaj Ramaswamy) expiry to 01 Oct 2026
// PT monthly renewals overwrote the General Fitness 12-month expiry.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await prisma.member.findFirst({
    where: { memberId: "YF-2417" },
    select: { id: true, fullName: true, expiryDate: true, currentPackageId: true },
  });

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const generalFitnessPkg = await prisma.package.findFirst({
    where: { name: { contains: "General Fitness", mode: "insensitive" } },
    select: { id: true, name: true },
  });

  const before = { expiryDate: member.expiryDate, currentPackageId: member.currentPackageId };

  await prisma.member.update({
    where: { id: member.id },
    data: {
      startDate:        new Date("2025-10-02"),
      expiryDate:       new Date("2026-10-01"),
      renewalDueDate:   new Date("2026-10-01"),
      currentPackageId: generalFitnessPkg?.id ?? member.currentPackageId,
    },
  });

  return NextResponse.json({
    ok: true,
    member: member.fullName,
    before,
    after: { expiryDate: "2026-10-01", package: generalFitnessPkg?.name },
  });
}
