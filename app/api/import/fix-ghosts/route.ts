import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.member.updateMany({
    where: { memberId: { startsWith: "IMP-" } },
    data: { status: "INACTIVE" },
  });

  return NextResponse.json({ updated: result.count });
}
