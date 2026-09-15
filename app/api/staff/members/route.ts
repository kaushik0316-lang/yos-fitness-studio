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
      NOT: { memberId: { startsWith: "IMP-" } },
      ...(q ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { memberId: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      } : {}),
    },
    select: {
      id: true, memberId: true, fullName: true, phone: true, status: true,
      expiryDate: true, startDate: true, lastPaymentDate: true,
      memberships: {
        orderBy: { expiryDate: "desc" as const },
        take: 1,
        select: { package: { select: { name: true } } },
      },
      payments: {
        orderBy: { date: "desc" as const },
        take: 1,
        select: { categoryLabel: true },
      },
    },
    orderBy: { fullName: "asc" },
    take: 20,
  });

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, employeeId: true },
    orderBy: { fullName: "asc" },
  });

  const serialized = members.map((m) => ({
    id: m.id, memberId: m.memberId, fullName: m.fullName, phone: m.phone, status: m.status,
    expiryDate: m.expiryDate?.toISOString() ?? null,
    startDate: m.startDate?.toISOString() ?? null,
    lastPaymentDate: m.lastPaymentDate?.toISOString() ?? null,
    packageName: m.memberships[0]?.package?.name ?? m.payments[0]?.categoryLabel ?? null,
  }));

  return NextResponse.json({ members: serialized, employees });
}
