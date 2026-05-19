import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-ucase-2026-p3n8";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    select: { id: true, fullName: true, notes: true },
  });

  for (const e of employees) {
    await prisma.employee.update({
      where: { id: e.id },
      data: {
        fullName: e.fullName.trim().toUpperCase(),
        notes: e.notes ? e.notes.trim().toUpperCase() : null,
      },
    });
  }

  return NextResponse.json({ ok: true, updated: employees.length });
}
