import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mobile staff app — PIN-authenticated member search
async function verifyStaffPin(req: NextRequest) {
  const pin = req.headers.get("x-staff-pin");
  if (!pin) return null;
  const employee = await prisma.employee.findUnique({
    where: { pin },
    select: { id: true, isActive: true },
  });
  return employee?.isActive ? employee : null;
}

export async function GET(req: NextRequest) {
  const staff = await verifyStaffPin(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json([]);

  const tokens = q.split(/\s+/).filter(Boolean);
  const members = await prisma.member.findMany({
    where: {
      AND: tokens.map((t) => ({
        OR: [
          { fullName: { contains: t, mode: "insensitive" } },
          { memberId: { contains: t, mode: "insensitive" } },
          { phone: { contains: t } },
        ],
      })),
    },
    select: { id: true, fullName: true, memberId: true, phone: true, status: true, expiryDate: true },
    orderBy: { fullName: "asc" },
    take: 10,
  });

  return NextResponse.json(members);
}
