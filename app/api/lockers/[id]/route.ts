import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — locker detail with full history
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locker = await prisma.locker.findUnique({
    where: { id: params.id },
    include: {
      member: { select: { id: true, fullName: true, memberId: true, phone: true } },
      employee: { select: { id: true, fullName: true, employeeId: true } },
      history: {
        orderBy: { allocatedDate: "desc" },
        include: {
          member: { select: { id: true, fullName: true, memberId: true } },
          employee: { select: { id: true, fullName: true, employeeId: true } },
        },
      },
    },
  });

  if (!locker) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ locker });
}
