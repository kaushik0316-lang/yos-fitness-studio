import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-dedup-2026";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // All IMP- members
  const imp = await prisma.member.findMany({
    where: { memberId: { startsWith: "IMP-" } },
    select: {
      id: true, memberId: true, fullName: true, phone: true, status: true,
      _count: { select: { payments: true, attendances: true, memberships: true } },
    },
    orderBy: { memberId: "asc" },
  });

  // Group by phone (primary) then by name
  const byPhone: Record<string, typeof imp> = {};
  const byName:  Record<string, typeof imp> = {};

  for (const m of imp) {
    const phone = (m.phone ?? "").replace(/\D/g, "");
    if (phone && phone !== "0000000000" && phone.length >= 8) {
      if (!byPhone[phone]) byPhone[phone] = [];
      byPhone[phone].push(m);
    }
    const name = m.fullName.trim().toLowerCase();
    if (!byName[name]) byName[name] = [];
    byName[name].push(m);
  }

  const duplicates = [
    ...Object.values(byPhone).filter((g) => g.length > 1),
    ...Object.values(byName).filter((g) => g.length > 1 && !Object.values(byPhone).some((p) => p.length > 1 && p[0].id === g[0].id)),
  ];

  return NextResponse.json({ total: duplicates.length, duplicates });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.secret !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // body.merges = [{ keepId, deleteIds[] }]
  const { merges } = body as { merges: { keepId: string; deleteIds: string[] }[] };

  const results = [];
  for (const { keepId, deleteIds } of merges) {
    for (const deleteId of deleteIds) {
      // Move payments
      const movedPayments = await prisma.payment.updateMany({
        where: { memberId: deleteId },
        data: { memberId: keepId },
      });
      // Move memberships
      const movedMemberships = await prisma.membership.updateMany({
        where: { memberId: deleteId },
        data: { memberId: keepId },
      });
      // Move attendances
      const movedAttendances = await prisma.attendance.updateMany({
        where: { memberId: deleteId },
        data: { memberId: keepId },
      });
      // Delete the duplicate
      await prisma.member.delete({ where: { id: deleteId } });
      results.push({ kept: keepId, deleted: deleteId, movedPayments: movedPayments.count, movedMemberships: movedMemberships.count, movedAttendances: movedAttendances.count });
    }
  }

  return NextResponse.json({ ok: true, results });
}
