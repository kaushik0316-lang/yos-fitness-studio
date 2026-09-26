import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST — vacate a locker (closes the open history row, clears current holder)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "FRONT_DESK"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const locker = await prisma.locker.findUnique({ where: { id: params.id } });
  if (!locker) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (locker.status !== "OCCUPIED") {
    return NextResponse.json({ error: "Locker is already vacant" }, { status: 400 });
  }

  const now = new Date();

  const openHistory = await prisma.lockerHistory.findFirst({
    where: { lockerId: locker.id, vacatedDate: null },
    orderBy: { allocatedDate: "desc" },
  });

  const [, updated] = await prisma.$transaction([
    openHistory
      ? prisma.lockerHistory.update({ where: { id: openHistory.id }, data: { vacatedDate: now } })
      : prisma.lockerHistory.create({
          data: { lockerId: locker.id, holderName: locker.holderName ?? "Unknown", allocatedDate: locker.allocatedDate, vacatedDate: now },
        }),
    prisma.locker.update({
      where: { id: locker.id },
      data: { status: "VACANT", holderName: null, memberId: null, employeeId: null, allocatedDate: null },
      include: {
        member: { select: { id: true, fullName: true, memberId: true, phone: true } },
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
    }),
  ]);

  return NextResponse.json({ locker: updated });
}
