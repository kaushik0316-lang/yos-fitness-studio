import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { StaffToolsClient } from "@/components/staff/StaffToolsClient";
import { REGISTRATION_FORM_URL } from "@/lib/site-config";
import { startOfDay, endOfDay, addDays, startOfMonth, subDays } from "date-fns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operations Dashboard" };

export default async function StaffToolsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const today = new Date();
  const monthStart = startOfMonth(today);

  const [todayPayments, monthPayments, expiringThisWeek, expiringToday, activeMembers, expiredMembers] = await Promise.all([
    // Today's collections
    prisma.payment.aggregate({
      where: { date: { gte: startOfDay(today), lte: endOfDay(today) } },
      _sum: { amount: true },
      _count: true,
    }),
    // This month's collections
    prisma.payment.aggregate({
      where: { date: { gte: monthStart, lte: endOfDay(today) } },
      _sum: { amount: true },
      _count: true,
    }),
    // Expiring in next 7 days (still active)
    prisma.member.count({
      where: {
        expiryDate: { gte: startOfDay(today), lte: addDays(today, 7) },
        status: "ACTIVE",
      },
    }),
    // Expiring today
    prisma.member.count({
      where: {
        expiryDate: { gte: startOfDay(today), lte: endOfDay(today) },
        status: "ACTIVE",
      },
    }),
    // Total active members
    prisma.member.count({ where: { status: "ACTIVE" } }),
    // Lapsed in the last 90 days — actionable follow-ups only
    prisma.member.count({
      where: {
        status: "EXPIRED",
        memberId: { not: { startsWith: "IMP-" } }, // exclude ghosts
        expiryDate: { gte: subDays(today, 90) },
      },
    }),
  ]);

  // Members expiring soon (for the list)
  const expiringSoonList = await prisma.member.findMany({
    where: {
      expiryDate: { gte: today, lte: addDays(today, 7) },
      status: { in: ["ACTIVE", "EXPIRED"] },
    },
    select: {
      id: true,
      memberId: true,
      fullName: true,
      phone: true,
      expiryDate: true,
      primaryCompany: true,
    },
    orderBy: { expiryDate: "asc" },
    take: 10,
  });

  return (
    <>
      <Header title="Operations Dashboard" subtitle="Quick actions, stats and member tools" />
      <div className="flex-1 p-6">
        <StaffToolsClient
          formUrl={REGISTRATION_FORM_URL}
          userName={session.user.name ?? "Staff"}
          userRole={session.user.role ?? "FRONT_DESK"}
          todayPaymentCount={todayPayments._count}
          todayPaymentTotal={Number(todayPayments._sum.amount ?? 0)}
          monthPaymentTotal={Number(monthPayments._sum.amount ?? 0)}
          monthPaymentCount={monthPayments._count}
          expiringThisWeek={expiringThisWeek}
          expiringToday={expiringToday}
          activeMembers={activeMembers}
          expiredMembers={expiredMembers}
          expiringSoonList={expiringSoonList.map((m) => ({
            ...m,
            expiryDate: m.expiryDate ? m.expiryDate.toISOString() : null,
          }))}
        />
      </div>
    </>
  );
}
