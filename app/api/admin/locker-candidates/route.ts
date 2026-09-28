import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Temporary read-only helper for the unlinked lockers.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== "yos-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const lockers = await prisma.locker.findMany({
    where: { status: "OCCUPIED", linkedMembers: { none: {} }, linkedStaff: { none: {} } },
    orderBy: { number: "asc" },
    select: { number: true, holderName: true },
  });
  const out = [];
  for (const l of lockers) {
    const matches = [];
    for (const t of (l.holderName ?? "").split("/").map((s) => s.trim()).filter(Boolean)) {
      const found = await prisma.member.findMany({
        where: { AND: t.split(/\s+/).map((w) => ({ fullName: { contains: w, mode: "insensitive" as const } })) },
        select: { fullName: true, memberId: true, status: true, phone: true, expiryDate: true, lastAttendanceDate: true },
        take: 10,
      });
      matches.push({ token: t, found: found.map((m) => `${m.memberId} ${m.fullName} [${m.status}] exp:${m.expiryDate?.toISOString().slice(0, 10) ?? "-"} last:${m.lastAttendanceDate?.toISOString().slice(0, 10) ?? "-"}`) });
    }
    out.push({ n: l.number, holder: l.holderName, matches });
  }
  const employees = (await prisma.employee.findMany({ where: { isActive: true }, select: { fullName: true, role: true } })).map((e) => `${e.fullName} (${e.role})`);
  return NextResponse.json({ out, employees });
}
