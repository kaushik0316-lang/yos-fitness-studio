import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Number of enquiries added after `since` — drives the sidebar badge.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "FRONT_DESK", "TRAINER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const since = new Date(req.nextUrl.searchParams.get("since") ?? "");
  if (isNaN(since.getTime())) return NextResponse.json({ count: 0 });

  const count = await prisma.enquiry.count({ where: { createdAt: { gt: since } } });
  return NextResponse.json({ count });
}
