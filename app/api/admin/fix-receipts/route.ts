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

  // Rename duration-based package names to clean category names
  const RENAMES: Record<string, string> = {
    "1 Month - Yos Fitness":    "General Fitness",
    "1 Month - Yos Studio":     "General Fitness",
    "3 Months - Yos Fitness":   "General Fitness",
    "3 Months - Yos Studio":    "General Fitness",
    "6 Months - Yos Fitness":   "General Fitness",
    "6 Months - Yos Studio":    "General Fitness",
    "12 Months - Yos Fitness":  "General Fitness",
    "12 Months - Yos Studio":   "General Fitness",
  };

  let updated = 0;
  for (const [from, to] of Object.entries(RENAMES)) {
    const r = await prisma.package.updateMany({ where: { name: from }, data: { name: to } });
    updated += r.count;
  }

  const packages = await prisma.package.findMany({
    select: { id: true, name: true, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, updated, packages });
}
