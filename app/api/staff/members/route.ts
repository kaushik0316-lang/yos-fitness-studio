import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rl = checkRateLimit(`${ip}:staff-members`, { maxAttempts: 60, windowMs: 60 * 1000, blockMs: 5 * 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { pin, q = "" } = await req.json() as { pin?: string; q?: string };
  if (!pin) return NextResponse.json({ error: "PIN required" }, { status: 401 });

  const employee = await prisma.employee.findUnique({
    where: { pin },
    select: { id: true, isActive: true },
  });
  if (!employee?.isActive) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });

  const members = await prisma.member.findMany({
    where: {
      status: "ACTIVE",
      NOT: { memberId: { startsWith: "IMP-" } },
      ...(q ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { memberId: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      } : {}),
    },
    select: { id: true, memberId: true, fullName: true, phone: true },
    orderBy: { fullName: "asc" },
    take: 20,
  });

  return NextResponse.json({ members });
}
