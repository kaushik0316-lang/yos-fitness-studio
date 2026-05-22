import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ghosts = await prisma.employee.findMany({
    where: { OR: [{ fullName: "" }, { fullName: null as any }] },
    select: { id: true, employeeId: true, fullName: true, role: true, phone: true, isActive: true },
  });
  return NextResponse.json({ ghosts });
}

export async function DELETE(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.employee.delete({ where: { id } });
  return NextResponse.json({ success: true, deleted: id });
}
