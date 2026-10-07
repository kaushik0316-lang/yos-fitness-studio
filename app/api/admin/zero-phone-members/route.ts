import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Temporary read-only report: ACTIVE members whose phone is all zeros.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("t") !== "b43ea1967284db51afb7f31b5bfea1e2") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const active = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    select: { memberId: true, fullName: true, phone: true, whatsapp: true, expiryDate: true, lastAttendanceDate: true },
    orderBy: { memberId: "asc" },
  });
  const isZero = (p: string | null) => !!p && /^0+$/.test(p.replace(/\D/g, ""));
  const real = (p: string | null) => { const d = (p ?? "").replace(/\D/g, "").slice(-10); return d.length === 10 && !/^(\d)\1+$/.test(d); };
  const rows = active.filter((m) => isZero(m.phone)).map((m) => ({
    memberId: m.memberId, name: m.fullName,
    expiry: m.expiryDate?.toISOString().slice(0, 10) ?? null,
    lastVisit: m.lastAttendanceDate?.toISOString().slice(0, 10) ?? null,
    hasRealWhatsapp: real(m.whatsapp),
  }));
  return NextResponse.json({ activeMembers: active.length, withZeroPhone: rows.length, members: rows });
}
