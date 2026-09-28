import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import data from "./data.json";

export const dynamic = "force-dynamic";

// One-time seed of lockers from the Excel sheet. Refuses to run if lockers exist.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== "yos-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((await prisma.locker.count()) > 0) {
    return NextResponse.json({ error: "Lockers already imported" }, { status: 409 });
  }

  const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");
  const [members, employees] = await Promise.all([
    prisma.member.findMany({ select: { id: true, fullName: true } }),
    prisma.employee.findMany({ select: { id: true, fullName: true } }),
  ]);
  const memberMap = new Map(members.map((m) => [norm(m.fullName), m.id]));
  const employeeMap = new Map(employees.map((e) => [norm(e.fullName), e.id]));

  const match = (name: string) => {
    const n = norm(name);
    if (n.includes("/") || n.includes(",")) return { memberId: null, employeeId: null };
    return { memberId: memberMap.get(n) ?? null, employeeId: employeeMap.get(n) ?? null };
  };
  const dt = (s: string | null) => (s ? new Date(s) : null);

  let occupied = 0;
  for (const row of data as { n: number; e: { name: string; date: string | null }[] }[]) {
    const locker = await prisma.locker.create({ data: { number: row.n } });
    const close = async (seg: { name: string; date: string | null }, vacated: string | null) =>
      prisma.lockerHistory.create({
        data: { lockerId: locker.id, holderName: seg.name, ...match(seg.name), allocatedDate: dt(seg.date), vacatedDate: dt(vacated) },
      });

    let open: { name: string; date: string | null } | null = null;
    for (const entry of row.e) {
      if (entry.name) {
        if (open) await close(open, entry.date);
        open = entry;
      } else if (entry.date) {
        if (open) await close(open, entry.date);
        open = null;
      }
    }
    if (open) {
      await close(open, null);
      await prisma.locker.update({
        where: { id: locker.id },
        data: { status: "OCCUPIED", holderName: open.name, ...match(open.name), allocatedDate: dt(open.date) },
      });
      occupied++;
    }
  }

  return NextResponse.json({ lockers: data.length, occupied, vacant: data.length - occupied });
}
