import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function verifyPin(pin: string) {
  if (!pin) return null;
  return prisma.employee.findUnique({ where: { pin }, select: { id: true } });
}

// GET /api/staff/enquiries/members?pin=xxxx&q=search
export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin") ?? "";
  const q   = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const employee = await verifyPin(pin);
  if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (q.length < 2) return NextResponse.json([]);

  const members = await prisma.member.findMany({
    where: {
      enquiry: null,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone:    { contains: q } },
        { memberId: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, memberId: true, phone: true },
    take: 8,
  });

  return NextResponse.json(members);
}
