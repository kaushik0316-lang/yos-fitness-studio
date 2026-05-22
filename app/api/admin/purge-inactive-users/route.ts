import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete all non-ADMIN users
  const { count } = await prisma.user.deleteMany({
    where: { role: { not: "ADMIN" } },
  });

  return NextResponse.json({ deleted: count });
}
