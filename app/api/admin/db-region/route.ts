import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Temporary diagnostic: where do the function and the database live, and how far apart?
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== "yos-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const times: number[] = [];
  for (let i = 0; i < 6; i++) {
    const t = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    times.push(Date.now() - t);
  }
  const t2 = Date.now();
  await prisma.member.count();
  await prisma.payment.count();
  await prisma.memberAttendance.count();
  return NextResponse.json({ functionRegion: process.env.VERCEL_REGION ?? null, selectOneMs: times, threeCountsMs: Date.now() - t2 });
}
