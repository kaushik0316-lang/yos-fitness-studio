import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-clear-members-2026-x7m4";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const total = await prisma.member.count();
  const { count } = await prisma.member.deleteMany({});

  return NextResponse.json({ ok: true, countBefore: total, membersDeleted: count });
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const total = await prisma.member.count();
  const byStatus = await prisma.member.groupBy({ by: ["status"], _count: true });
  return NextResponse.json({ total, byStatus });
}
