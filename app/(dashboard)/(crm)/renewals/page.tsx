import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { RenewalsClient } from "@/components/renewals/RenewalsClient";
import { addDays, startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Renewals" };

export default async function RenewalsPage() {
  const session = await auth();
  const today      = startOfDay(new Date());
  const in1Day     = endOfDay(addDays(today, 1));
  const in3Days    = endOfDay(addDays(today, 3));
  const in7Days    = endOfDay(addDays(today, 7));
  const in30Days   = endOfDay(addDays(today, 30));
  const past30Days = startOfDay(addDays(today, -30));

  const memberSelect = {
    id: true, memberId: true, fullName: true, phone: true, whatsapp: true,
    lastAttendanceDate: true, status: true,
    renewalFollowUps: { where: { isCompleted: false }, take: 1 },
    payments: {
      where: { isVoided: false },
      orderBy: { date: "desc" as const },
      take: 1,
      select: { amount: true, discount: true, categoryLabel: true },
    },
  };

  const membershipSelect = {
    id: true, expiryDate: true, startDate: true,
    package: { select: { name: true } },
    member: { select: memberSelect },
  };

  const [expiredMemberships, expiring1, expiring3, expiring7, expiring30, renewedToday, packages] = await Promise.all([
    // Expired in the last 30 days — one row per membership
    prisma.membership.findMany({
      where: { expiryDate: { gte: past30Days, lte: endOfDay(today) } },
      select: membershipSelect,
      orderBy: { expiryDate: "desc" },
    }),
    // Due today / tomorrow
    prisma.membership.findMany({
      where: { expiryDate: { gte: today, lte: in1Day } },
      select: membershipSelect,
      orderBy: { expiryDate: "desc" },
    }),
    // Expiring in 3 days
    prisma.membership.findMany({
      where: { expiryDate: { gt: in1Day, lte: in3Days } },
      select: membershipSelect,
      orderBy: { expiryDate: "desc" },
    }),
    // Expiring in 7 days
    prisma.membership.findMany({
      where: { expiryDate: { gt: in3Days, lte: in7Days } },
      select: membershipSelect,
      orderBy: { expiryDate: "desc" },
    }),
    // Expiring this month
    prisma.membership.findMany({
      where: { expiryDate: { gte: today, lte: in30Days } },
      select: membershipSelect,
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
          expiredMemberships={expiredMemberships as any}
          expiring1={expiring1 as any}
          expiring3={expiring3 as any}
          expiring7={expiring7 as any}
          expiring30={expiring30 as any}
          renewedToday={renewedToday as any}
          packages={packages}
          userRole={session!.user.role}
          userId={session!.user.id}
        />
      </div>
    </>
  );
}
