import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — list all lockers with current holder info
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lockers = await prisma.locker.findMany({
    orderBy: { number: "asc" },
    include: {
      member: { select: { id: true, fullName: true, memberId: true, phone: true } },
      employee: { select: { id: true, fullName: true, employeeId: true } },
      _count: { select: { history: true } },
    },
  });

  return NextResponse.json({ lockers });
}
