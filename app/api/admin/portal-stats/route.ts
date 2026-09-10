import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [totalActive, pinSetActive, totalAll, pinSetAll] = await Promise.all([
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.member.count({ where: { status: "ACTIVE", pin: { not: null } } }),
    prisma.member.count({ where: { status: { not: "PROSPECT" } } }),
    prisma.member.count({ where: { pin: { not: null } } }),
  ]);

  // Members who set PIN grouped by status
  const byStatus = await prisma.member.groupBy({
    by: ["status"],
    where: { pin: { not: null } },
    _count: true,
  });

  return NextResponse.json({
    totalActive,
    pinSetActive,
    pctActive: ((pinSetActive / totalActive) * 100).toFixed(1),
    totalAll,
    pinSetAll,
    pctAll: ((pinSetAll / totalAll) * 100).toFixed(1),
    byStatus,
  });
}
