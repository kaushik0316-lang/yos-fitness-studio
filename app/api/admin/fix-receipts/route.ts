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

  // Deactivate duration-based packages (they disappear from dropdowns, history preserved)
  const DEACTIVATE = [
    "1 Month - Yos Fitness", "1 Month - Yos Studio",
    "3 Months - Yos Fitness", "3 Months - Yos Studio",
    "6 Months - Yos Fitness", "6 Months - Yos Studio",
    "12 Months - Yos Fitness", "12 Months - Yos Studio",
  ];

  const r = await prisma.package.updateMany({
    where: { name: { in: DEACTIVATE } },
    data: { isActive: false },
  });
  const updated = r.count;

  const packages = await prisma.package.findMany({
    select: { id: true, name: true, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, updated, packages });
}
