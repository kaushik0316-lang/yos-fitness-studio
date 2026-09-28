import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Temporary: links members to occupied lockers when a name token matches exactly
// one member (or exactly one ACTIVE member). Skips lockers already linked.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== "yos-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apply = req.nextUrl.searchParams.get("apply") === "1";
  const lockers = await prisma.locker.findMany({
    where: { status: "OCCUPIED" },
    orderBy: { number: "asc" },
    select: { id: true, number: true, holderName: true, _count: { select: { linkedMembers: true } } },
  });
  const linked: string[] = [], skipped: string[] = [], alreadyLinked: number[] = [];
  for (const l of lockers) {
    if (l._count.linkedMembers > 0) { alreadyLinked.push(l.number); continue; }
    for (const t of (l.holderName ?? "").split("/").map((s) => s.trim()).filter(Boolean)) {
      const found = await prisma.member.findMany({
        where: { AND: t.split(/\s+/).map((w) => ({ fullName: { contains: w, mode: "insensitive" as const } })) },
        select: { id: true, fullName: true, memberId: true, status: true },
        take: 20,
      });
      const active = found.filter((m) => m.status === "ACTIVE");
      const pick = found.length === 1 ? found[0] : active.length === 1 ? active[0] : null;
      if (!pick) { skipped.push(`#${l.number} ${t} (${found.length} matches)`); continue; }
      if (apply) await prisma.lockerMember.createMany({ data: [{ lockerId: l.id, memberId: pick.id }], skipDuplicates: true });
      linked.push(`#${l.number} ${t} -> ${pick.memberId} ${pick.fullName}`);
    }
  }
  return NextResponse.json({ apply, linked, skipped, alreadyLinked });
}
