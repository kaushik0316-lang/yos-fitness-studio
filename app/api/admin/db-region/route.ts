import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Temporary diagnostic: which region is the function in, which region is the database in?
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== "yos-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const host = (process.env.DATABASE_URL ?? "").split("@")[1]?.split("/")[0] ?? "";
  const dbRegion = host.match(/\.([a-z]{2}-[a-z]+-\d)\./)?.[1] ?? "unknown";
  const times: number[] = [];
  for (let i = 0; i < 6; i++) {
    const t = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    times.push(Date.now() - t);
  }
  const members = await prisma.member.count();
  return NextResponse.json({ functionRegion: process.env.VERCEL_REGION ?? null, dbRegion, selectOneMs: times, members });
}
