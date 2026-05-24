import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find members with no currentPackageId (or null)
  const members = await prisma.member.findMany({
    where: { currentPackageId: null },
    select: { id: true },
  });

  let fixed = 0;
  let noPackageFound = 0;

  for (const member of members) {
    const latestPayment = await prisma.payment.findFirst({
      where: { memberId: member.id, packageId: { not: null } },
      orderBy: { date: "desc" },
      select: { packageId: true, startDate: true, expiryDate: true },
    });

    if (!latestPayment?.packageId) {
      noPackageFound++;
      continue;
    }

    await prisma.member.update({
      where: { id: member.id },
      data: {
        currentPackageId: latestPayment.packageId,
        ...(latestPayment.startDate && { startDate: latestPayment.startDate }),
        ...(latestPayment.expiryDate && {
          expiryDate: latestPayment.expiryDate,
          renewalDueDate: latestPayment.expiryDate,
        }),
      },
    });
    fixed++;
  }

  return NextResponse.json({ fixed, noPackageFound });
}
