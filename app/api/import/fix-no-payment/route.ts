import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find members who have no payment records at all
  const membersWithPayments = await prisma.payment.findMany({
    distinct: ["memberId"],
    select: { memberId: true },
  });
  const paidIds = new Set(membersWithPayments.map((p) => p.memberId));

  const result = await prisma.member.updateMany({
    where: {
      id: { notIn: [...paidIds] },
      status: { in: ["ACTIVE", "INACTIVE"] },
    },
    data: { status: "PROSPECT" },
  });

  return NextResponse.json({ updated: result.count });
}
