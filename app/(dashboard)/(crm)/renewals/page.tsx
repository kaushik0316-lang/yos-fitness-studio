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
  const today    = startOfDay(new Date());
  const in1Day   = endOfDay(addDays(today, 1));
  const in3Days  = endOfDay(addDays(today, 3));
  const in7Days  = endOfDay(addDays(today, 7));
  const in30Days = endOfDay(addDays(today, 30));

  const memberSelect = { id: true, memberId: true, fullName: true, phone: true, whatsapp: true, expiryDate: true, lastAttendanceDate: true, currentPackage: { select: { name: true } } };

  const [expiredMembers, expiring1, expiring3, expiring7, expiring30Active, renewedToday, packages] = await Promise.all([
    // All expired members — no cap
    prisma.member.findMany({
      where: { status: MemberStatus.EXPIRED },
      select: {
        ...memberSelect,
        trainer: { select: { fullName: true } },
        renewalFollowUps: { where: { isCompleted: false }, take: 1 },
      },
      orderBy: { expiryDate: "desc" },
    }),
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE, expiryDate: { gte: today, lte: in1Day } },
      select: memberSelect, orderBy: { expiryDate: "desc" },
    }),
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE, expiryDate: { gt: in1Day, lte: in3Days } },
      select: memberSelect, orderBy: { expiryDate: "desc" },
    }),
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE, expiryDate: { gt: in3Days, lte: in7Days } },
      select: memberSelect, orderBy: { expiryDate: "desc" },
    }),
    // Active members expiring in 7–30 days (expired ones already fetched separately)
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE, expiryDate: { gt: in7Days, lte: in30Days } },
      select: memberSelect, orderBy: { expiryDate: "desc" },
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

  // Sort helper: nulls always last, otherwise descending by date
  function sortDesc(a: { expiryDate: Date | null }, b: { expiryDate: Date | null }) {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
  }

  // Re-sort expired list so null-expiry members go to the bottom
  const expiredSorted = [...expiredMembers].sort(sortDesc);

  return (
    <>
      <Header title="Renewals" subtitle="Memberships expiring soon" />
      <div className="flex-1 overflow-y-auto p-6">
        <RenewalsClient
          expiredMembers={expiredSorted as any}
          expiring1={expiring1 as any}
          expiring3={expiring3 as any}
          expiring7={expiring7 as any}
          expiring30={expiring30Active as any}
          renewedToday={renewedToday as any}
          packages={packages}
          userRole={session!.user.role}
          userId={session!.user.id}
        />
      </div>
    </>
  );
}
