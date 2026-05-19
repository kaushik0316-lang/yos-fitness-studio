import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-clear-members-2026-x7m4";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cascade deletes handle: Membership, Payment, MemberAttendance, RenewalFollowUp, etc.
  const { count } = await prisma.member.deleteMany({});

  return NextResponse.json({ ok: true, membersDeleted: count });
}
