import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.member.findMany({
    where: { pin: { not: null } },
    select: {
      id: true,
      memberId: true,
      fullName: true,
      status: true,
      phone: true,
      pin: true,
      allowKioskCheckin: true,
      currentPackage: { select: { name: true } },
      expiryDate: true,
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({ members });
}
