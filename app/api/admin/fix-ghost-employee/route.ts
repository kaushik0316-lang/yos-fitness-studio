import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Active employees with null/empty fullName
  const allActive = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, employeeId: true },
    orderBy: { fullName: "asc" },
  });

  const noName = allActive.filter(e => !e.fullName || e.fullName.trim() === "");

  // 2. May 2026 attendance records for employees NOT in active list
  const activeIds = allActive.map(e => e.id);
  const may2026Start = new Date("2026-05-01");
  const may2026End   = new Date("2026-05-31");

  const orphaned = await prisma.employeeAttendance.findMany({
    where: {
      date: { gte: may2026Start, lte: may2026End },
      employeeId: { notIn: activeIds },
    },
    include: { employee: { select: { id: true, fullName: true, isActive: true } } },
    distinct: ["employeeId"],
  });

  return NextResponse.json({
    activeCount: allActive.length,
    activeEmployees: allActive,
    noNameActive: noName,
    orphanedAttendance: orphaned,
  });
}

export async function DELETE(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.employee.delete({ where: { id } });
  return NextResponse.json({ success: true, deleted: id });
}
