import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function guard() {
  const session = await auth();
  return session?.user && ["ADMIN", "FRONT_DESK"].includes(session.user.role);
}

const linkedSelect = { select: { member: { select: { id: true, fullName: true, memberId: true } } } };

// POST — link one or more members to a locker
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { memberIds } = (await req.json()) as { memberIds: string[] };
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json({ error: "memberIds required" }, { status: 400 });
  }
  await prisma.lockerMember.createMany({
    data: memberIds.map((memberId) => ({ lockerId: params.id, memberId })),
    skipDuplicates: true,
  });
  const rows = await prisma.lockerMember.findMany({ where: { lockerId: params.id }, ...linkedSelect });
  return NextResponse.json({ linked: rows.map((r) => r.member) });
}

// DELETE — unlink a member (?memberId=)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  await prisma.lockerMember.deleteMany({ where: { lockerId: params.id, memberId } });
  const rows = await prisma.lockerMember.findMany({ where: { lockerId: params.id }, ...linkedSelect });
  return NextResponse.json({ linked: rows.map((r) => r.member) });
}
