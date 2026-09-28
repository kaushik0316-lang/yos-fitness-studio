import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Temporary read-only helper: candidate member matches for occupied lockers.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== "yos-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const lockers = await prisma.locker.findMany({
    where: { status: "OCCUPIED" },
    orderBy: { number: "asc" },
    select: { number: true, holderName: true },
  });
  const out = [];
  for (const l of lockers) {
    const tokens = (l.holderName ?? "").split("/").map((t) => t.trim()).filter(Boolean);
    const matches = [];
    for (const t of tokens) {
      const words = t.split(/\s+/);
      const found = await prisma.member.findMany({
        where: { AND: words.map((w) => ({ fullName: { contains: w, mode: "insensitive" as const } })) },
        select: { id: true, fullName: true, memberId: true, status: true },
        orderBy: { status: "asc" },
        take: 6,
      });
      matches.push({ token: t, found: found.map((m) => `${m.memberId} ${m.fullName} [${m.status}]`) });
    }
    out.push({ n: l.number, holder: l.holderName, matches });
  }
  return NextResponse.json(out);
}
