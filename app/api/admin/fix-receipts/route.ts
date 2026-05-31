import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-fix-packages-2026";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const packages = await prisma.package.findMany({
    select: { id: true, name: true, isActive: true, durationDays: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ packages });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.secret !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Keep only ONE active "General Fitness" package, deactivate the rest
  const allGF = await prisma.package.findMany({ where: { name: "General Fitness" }, orderBy: { createdAt: "asc" } });
  const keepId = allGF[0]?.id;
  let updated = 0;
  if (keepId && allGF.length > 1) {
    const r = await prisma.package.updateMany({
      where: { name: "General Fitness", id: { not: keepId } },
      data: { isActive: false },
    });
    updated = r.count;
  }

  const packages = await prisma.package.findMany({
    select: { id: true, name: true, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, updated, packages });
}
