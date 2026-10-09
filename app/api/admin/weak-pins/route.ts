import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWeakPin } from "@/lib/pin";

export const dynamic = "force-dynamic";

// Temporary: report members whose PIN is weak; ?apply=1 clears those PINs (they set a new one).
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("t") !== "6aca007b12d1df0a05da717c02ab4d70") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const withPin = await prisma.member.findMany({
    where: { pin: { not: null } },
    select: { id: true, memberId: true, fullName: true, status: true, pin: true },
  });
  const weak = withPin.filter((m) => isWeakPin(m.pin ?? ""));
  const apply = req.nextUrl.searchParams.get("apply") === "1";
  let cleared = 0;
  if (apply && weak.length > 0) {
    cleared = (await prisma.member.updateMany({ where: { id: { in: weak.map((m) => m.id) } }, data: { pin: null } })).count;
  }
  return NextResponse.json({
    membersWithPin: withPin.length,
    weakCount: weak.length,
    cleared,
    weak: weak.map((m) => ({ memberId: m.memberId, name: m.fullName, status: m.status })),
  });
}
