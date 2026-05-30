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

  // Fall back to payment dates if no membership record
  const startDate  = membership?.startDate  ?? ranjani.payments[0]?.startDate;
  const expiryDate = membership?.expiryDate ?? ranjani.payments[0]?.expiryDate;
  const packageId  = membership?.packageId  ?? ranjani.payments[0]?.packageId;

  if (!expiryDate) return NextResponse.json({ error: "No expiry date found", ranjani }, { status: 404 });

  const updated = await prisma.member.update({
    where: { id: ranjani.id },
    data: {
      currentPackageId: packageId,
      startDate,
      expiryDate,
      renewalDueDate: expiryDate,
      status: "ACTIVE",
    },
    select: { id: true, fullName: true, memberId: true, status: true, expiryDate: true },
  });

  return NextResponse.json({ ok: true, updated });
}
