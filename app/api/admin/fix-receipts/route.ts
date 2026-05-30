import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-dedup-2026";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const imp = await prisma.member.findMany({
    where: { memberId: { startsWith: "IMP-" } },
    select: { id: true, memberId: true, fullName: true, phone: true, status: true },
    orderBy: { memberId: "asc" },
  });

  // Group by phone
  const byPhone: Record<string, typeof imp> = {};
  for (const m of imp) {
    const phone = (m.phone ?? "").replace(/\D/g, "");
    if (phone && phone !== "0000000000" && phone.length >= 8) {
      if (!byPhone[phone]) byPhone[phone] = [];
      byPhone[phone].push(m);
    }
  }

  // Group by name (only those not already caught by phone)
  const phoneDupIds = new Set(
    Object.values(byPhone).filter(g => g.length > 1).flatMap(g => g.map(m => m.id))
  );
  const byName: Record<string, typeof imp> = {};
  for (const m of imp) {
    if (phoneDupIds.has(m.id)) continue;
    const key = m.fullName.trim().toLowerCase();
    if (!byName[key]) byName[key] = [];
    byName[key].push(m);
  }

  const phoneDups = Object.values(byPhone).filter(g => g.length > 1);
  const nameDups  = Object.values(byName).filter(g => g.length > 1);

  return NextResponse.json({
    total: phoneDups.length + nameDups.length,
    byPhone: phoneDups,
    byName: nameDups,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.secret !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { merges } = body as { merges: { keepId: string; deleteIds: string[] }[] };
  const results = [];

  for (const { keepId, deleteIds } of merges) {
    for (const deleteId of deleteIds) {
      // Move payments & memberships to keep member
      await prisma.payment.updateMany({ where: { memberId: deleteId }, data: { memberId: keepId } });
      await prisma.membership.updateMany({ where: { memberId: deleteId }, data: { memberId: keepId } });
      // Delete all other related records (IMP members won't have meaningful attendance/logs)
      await prisma.memberAttendance.deleteMany({ where: { memberId: deleteId } });
      await prisma.renewalFollowUp.deleteMany({ where: { memberId: deleteId } });
      await prisma.messageLog.deleteMany({ where: { memberId: deleteId } });
      // Now safe to delete the member
      await prisma.member.delete({ where: { id: deleteId } });
      results.push({ kept: keepId, deleted: deleteId });
    }
  }

  return NextResponse.json({ ok: true, merged: results.length, results });
}
