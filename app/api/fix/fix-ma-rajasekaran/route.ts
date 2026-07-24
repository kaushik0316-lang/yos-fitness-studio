import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const member = await prisma.member.findFirst({
    where: { memberId: "YF-2551" },
    select: { id: true, fullName: true, expiryDate: true, status: true },
  });

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const updated = await prisma.member.update({
    where: { id: member.id },
    data: {
      expiryDate:     new Date("2026-12-21T00:00:00.000Z"),
      startDate:      new Date("2025-12-22T00:00:00.000Z"),
      status:         "ACTIVE",
    },
    select: { memberId: true, fullName: true, expiryDate: true, status: true },
  });

  return NextResponse.json({ ok: true, before: { expiryDate: member.expiryDate, status: member.status }, after: updated });
}
