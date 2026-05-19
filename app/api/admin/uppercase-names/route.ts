import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-ucase-2026-p3n8";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const u = (s: string | null) => s ? s.trim().toUpperCase() : null;

  // Uppercase all employee names and notes
  const employees = await prisma.employee.findMany({
    select: { id: true, fullName: true, notes: true },
  });
  for (const e of employees) {
    await prisma.employee.update({
      where: { id: e.id },
      data: { fullName: u(e.fullName)!, notes: u(e.notes) },
    });
  }

  // Uppercase all auth user names (shows in admin greeting)
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  });
  for (const user of users) {
    if (user.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: u(user.name) },
      });
    }
  }

  // Uppercase all member text fields
  const members = await prisma.member.findMany({
    select: { id: true, fullName: true, address: true, emergencyContact: true, healthConditions: true, notes: true },
  });
  for (const m of members) {
    await prisma.member.update({
      where: { id: m.id },
      data: {
        fullName: u(m.fullName)!,
        address: u(m.address),
        emergencyContact: u(m.emergencyContact),
        healthConditions: u(m.healthConditions),
        notes: u(m.notes),
      },
    });
  }

  return NextResponse.json({
    ok: true,
    employeesUpdated: employees.length,
    usersUpdated: users.length,
    membersUpdated: members.length,
  });
}
