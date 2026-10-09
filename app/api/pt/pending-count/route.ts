import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PT requests waiting for a trainer's answer, for the sidebar badge.
export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "FRONT_DESK"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const count = await prisma.ptBooking.count({ where: { status: "REQUESTED", expiresAt: { gt: new Date() } } });
  return NextResponse.json({ count });
}
