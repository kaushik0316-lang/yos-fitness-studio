import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Number of member requests waiting for staff — drives the sidebar badge.
export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "FRONT_DESK"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const count = await prisma.memberRequest.count({ where: { status: "PENDING" } });
  return NextResponse.json({ count });
}
