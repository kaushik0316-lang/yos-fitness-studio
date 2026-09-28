import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function guard() {
  const session = await auth();
  return session?.user && ["ADMIN", "FRONT_DESK"].includes(session.user.role);
}

async function current(lockerId: string) {
  const [m, e] = await Promise.all([
    prisma.lockerMember.findMany({ where: { lockerId }, select: { member: { select: { id: true, fullName: true, memberId: true } } } }),
    prisma.lockerStaff.findMany({ where: { lockerId }, select: { employee: { select: { id: true, fullName: true, employeeId: true } } } }),
  ]);
  return { linked: m.map((r) => r.member), linkedStaff: e.map((r) => r.employee) };
}

// POST — link members and/or staff to a locker
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { memberIds = [], employeeIds = [] } = (await req.json()) as { memberIds?: string[]; employeeIds?: string[] };
  if (memberIds.length === 0 && employeeIds.length === 0) {
    return NextResponse.json({ error: "memberIds or employeeIds required" }, { status: 400 });
  }
  await prisma.lockerMember.createMany({ data: memberIds.map((memberId) => ({ lockerId: params.id, memberId })), skipDuplicates: true });
  await prisma.lockerStaff.createMany({ data: employeeIds.map((employeeId) => ({ lockerId: params.id, employeeId })), skipDuplicates: true });
  return NextResponse.json(await current(params.id));
}

// DELETE — unlink (?memberId= or ?employeeId=)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const memberId = req.nextUrl.searchParams.get("memberId");
  const employeeId = req.nextUrl.searchParams.get("employeeId");
  if (!memberId && !employeeId) return NextResponse.json({ error: "memberId or employeeId required" }, { status: 400 });
  if (memberId) await prisma.lockerMember.deleteMany({ where: { lockerId: params.id, memberId } });
  if (employeeId) await prisma.lockerStaff.deleteMany({ where: { lockerId: params.id, employeeId } });
  return NextResponse.json(await current(params.id));
}
