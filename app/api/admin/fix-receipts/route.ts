import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-transfer-ranjani";

export async function POST(req: Request) {
  const body = await req.json();
  if (body.secret !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find Ranjani Monogaran
  const ranjani = await prisma.member.findFirst({
    where: { fullName: { contains: "ranjani mono", mode: "insensitive" } },
    include: {
      memberships: { orderBy: { startDate: "desc" }, take: 1 },
      payments: { orderBy: { date: "desc" }, take: 1, include: { membership: true } },
    },
  });

  if (!ranjani) return NextResponse.json({ error: "Ranjani Monogaran not found" }, { status: 404 });

  // Use latest membership or latest payment's membership
  const membership = ranjani.memberships[0] ?? ranjani.payments[0]?.membership;

  if (!membership) return NextResponse.json({ error: "No membership found", ranjani }, { status: 404 });

  const updated = await prisma.member.update({
    where: { id: ranjani.id },
    data: {
      currentPackageId: membership.packageId,
      startDate: membership.startDate,
      expiryDate: membership.expiryDate,
      renewalDueDate: membership.expiryDate,
      status: "ACTIVE",
    },
    select: { id: true, fullName: true, memberId: true, status: true, expiryDate: true },
  });

  return NextResponse.json({ ok: true, updated });
}
