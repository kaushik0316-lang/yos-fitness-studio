import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await prisma.member.update({
    where: { id: "cmpcpancu01qzqgfqhxwkir4d" },
    data: { expiryDate: new Date("2026-10-01"), renewalDueDate: new Date("2026-10-01"), status: "ACTIVE" },
    select: { fullName: true, status: true, expiryDate: true },
  });

  return NextResponse.json({ ok: true, member });
}
