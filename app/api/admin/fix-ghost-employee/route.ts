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

/**
 * DELETE /api/admin/fix-ghost-employee
 * Body: { purgeOrphaned: true } — deletes ALL attendance records for inactive employees
 * Body: { id: "employeeId" } — deletes a specific employee record
 */
export async function DELETE(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.purgeOrphaned) {
    // Delete all attendance records belonging to inactive employees
    const inactiveEmployees = await prisma.employee.findMany({
      where: { isActive: false },
      select: { id: true },
    });
    const inactiveIds = inactiveEmployees.map(e => e.id);

    const result = await prisma.employeeAttendance.deleteMany({
      where: { employeeId: { in: inactiveIds } },
    });
    return NextResponse.json({ success: true, deletedAttendanceRecords: result.count, forEmployees: inactiveIds.length });
  }

  if (body.deleteInactive) {
    // Delete all inactive employees (attendance already purged)
    const result = await prisma.employee.deleteMany({ where: { isActive: false } });
    return NextResponse.json({ success: true, deletedEmployees: result.count });
  }

  if (body.id) {
    await prisma.employee.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true, deleted: body.id });
  }

  return NextResponse.json({ error: "Provide purgeOrphaned: true, deleteInactive: true, or id: string" }, { status: 400 });
}
