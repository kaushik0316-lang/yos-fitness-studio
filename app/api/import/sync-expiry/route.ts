import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  let membersProcessed = 0;
  let setActive = 0;
  let setExpired = 0;
  let errors = 0;

  // Get all members who have at least one payment with an expiryDate
  const membersWithPayments = await prisma.payment.groupBy({
    by: ["memberId"],
    where: { expiryDate: { not: null } },
  });

  for (const { memberId } of membersWithPayments) {
    try {
      const latest = await prisma.payment.findFirst({
        where: { memberId, expiryDate: { not: null } },
        orderBy: { expiryDate: "desc" },
        select: { expiryDate: true, startDate: true, packageId: true },
      });
      if (!latest?.expiryDate) continue;

      const status = latest.expiryDate >= today ? "ACTIVE" : "EXPIRED";
      await prisma.member.update({
        where: { id: memberId },
        data: {
          status,
          expiryDate: latest.expiryDate,
          renewalDueDate: latest.expiryDate,
          ...(latest.startDate && { startDate: latest.startDate }),
          ...(latest.packageId && { currentPackageId: latest.packageId }),
        },
      });
      membersProcessed++;
      if (status === "ACTIVE") setActive++; else setExpired++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ membersProcessed, setActive, setExpired, errors });
}
