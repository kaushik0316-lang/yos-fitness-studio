import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { RenewalsClient } from "@/components/renewals/RenewalsClient";
import { MemberStatus } from "@prisma/client";
import { addDays, startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Renewals" };

export default async function RenewalsPage() {
  const session = await auth();
  const today = startOfDay(new Date());
  const in1Day = endOfDay(addDays(today, 1));
  const in3Days = endOfDay(addDays(today, 3));
  const in7Days = endOfDay(addDays(today, 7));

  const [expiredMembers, expiring1, expiring3, expiring7, renewedToday, packages] = await Promise.all([
    prisma.member.findMany({
      where: { status: MemberStatus.EXPIRED },
      select: {
        id: true, memberId: true, fullName: true, phone: true, whatsapp: true,
        expiryDate: true, lastAttendanceDate: true,
        currentPackage: { select: { name: true } },
        trainer: { select: { fullName: true } },
        renewalFollowUps: { where: { isCompleted: false }, take: 1 },
      },
      orderBy: { expiryDate: "desc" },
      take: 50,
    }),
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE, expiryDate: { gte: today, lte: in1Day } },
      select: { id: true, memberId: true, fullName: true, phone: true, whatsapp: true, expiryDate: true, currentPackage: { select: { name: true } } },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE, expiryDate: { gt: in1Day, lte: in3Days } },
      select: { id: true, memberId: true, fullName: true, phone: true, whatsapp: true, expiryDate: true, currentPackage: { select: { name: true } } },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE, expiryDate: { gt: in3Days, lte: in7Days } },
      select: { id: true, memberId: true, fullName: true, phone: true, whatsapp: true, expiryDate: true, currentPackage: { select: { name: true } } },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.membership.findMany({
      where: { createdAt: { gte: startOfDay(today), lte: endOfDay(today) } },
      include: {
        member: { select: { memberId: true, fullName: true } },
        package: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.package.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Header title="Renewals" subtitle="Memberships expiring soon" />
      <div className="flex-1 overflow-y-auto p-6">
        <RenewalsClient
          expiredMembers={expiredMembers as any}
          expiring1={expiring1 as any}
          expiring3={expiring3 as any}
          expiring7={expiring7 as any}
          renewedToday={renewedToday as any}
          packages={packages}
          userRole={session!.user.role}
          userId={session!.user.id}
        />
      </div>
    </>
  );
}
