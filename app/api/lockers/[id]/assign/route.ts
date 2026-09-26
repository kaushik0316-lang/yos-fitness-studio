import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST — assign a locker to a member, employee, or free-text name
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "FRONT_DESK"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const holderName: string = (body.holderName ?? "").trim();
  const memberId: string | null = body.memberId ?? null;
  const employeeId: string | null = body.employeeId ?? null;

  if (!holderName) {
    return NextResponse.json({ error: "Holder name required" }, { status: 400 });
  }

  const locker = await prisma.locker.findUnique({ where: { id: params.id } });
  if (!locker) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (locker.status === "OCCUPIED") {
    return NextResponse.json({ error: "Locker is already occupied — vacate it first" }, { status: 400 });
  }

  const now = new Date();

  const [, updated] = await prisma.$transaction([
    prisma.lockerHistory.create({
      data: {
        lockerId: locker.id,
        holderName,
        memberId,
        employeeId,
        allocatedDate: now,
      },
    }),
    prisma.locker.update({
      where: { id: locker.id },
      data: {
        status: "OCCUPIED",
        holderName,
        memberId,
        employeeId,
        allocatedDate: now,
      },
      include: {
        member: { select: { id: true, fullName: true, memberId: true, phone: true } },
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
    }),
  ]);

  return NextResponse.json({ locker: updated });
}
