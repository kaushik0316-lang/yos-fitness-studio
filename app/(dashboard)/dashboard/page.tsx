import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { InactiveMembersAlert } from "@/components/dashboard/InactiveMembersAlert";
import { RenewalsDueWidget } from "@/components/dashboard/RenewalsDueWidget";
import { TodayAttendanceWidget } from "@/components/dashboard/TodayAttendanceWidget";
import { CollectionsWidget } from "@/components/dashboard/CollectionsWidget";
import { Company, MemberStatus } from "@prisma/client";
import { subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

async function getDashboardData(userId: string) {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    activeMembers,
    expiredMembers,
    renewalsDueCount,
    inactiveMembers,
    todayAttendance,
    todayCollections,
    monthlyCollections,
    yosFitnessMonthly,
    yosStudioMonthly,
    employeePresentToday,
    recentAttendance,
    expiringMembers,
    inactiveMembersList,
  ] = await Promise.all([
    prisma.member.count({ where: { status: MemberStatus.ACTIVE } }),
    prisma.member.count({ where: { status: MemberStatus.EXPIRED } }),
    prisma.member.count({
      where: {
        status: MemberStatus.ACTIVE,
        expiryDate: { lte: in7Days, gte: today },
      },
    }),
    prisma.member.count({
      where: {
        status: MemberStatus.ACTIVE,
        lastAttendanceDate: { lt: subDays(today, 4) },
      },
    }),
    prisma.memberAttendance.count({
      where: { date: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.payment.aggregate({
      where: { date: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { company: Company.YOS_FITNESS, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { company: Company.YOS_FITNESS_STUDIO, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.employeeAttendance.count({
      where: { date: { gte: todayStart, lte: todayEnd }, status: "PRESENT" },
    }),
    prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT date, COUNT(*) as count
      FROM member_attendance
      WHERE date >= ${subDays(today, 6)}
      GROUP BY date
      ORDER BY date ASC
    `,
    prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        expiryDate: { gte: today, lte: in7Days },
      },
      select: { id: true, memberId: true, fullName: true, phone: true, expiryDate: true, primaryCompany: true },
      orderBy: { expiryDate: "asc" },
      take: 5,
    }),
    prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        OR: [
          { lastAttendanceDate: { lt: subDays(today, 3) } },
          { lastAttendanceDate: null },
        ],
      },
      select: {
        id: true, memberId: true, fullName: true, phone: true,
        lastAttendanceDate: true, expiryDate: true, primaryCompany: true,
        trainer: { select: { fullName: true } },
      },
      orderBy: { lastAttendanceDate: "asc" },
      take: 8,
    }),
  ]);

  return {
    stats: {
      activeMembers,
      expiredMembers,
      renewalsDueThisWeek: renewalsDueCount,
      inactiveMembers4Plus: inactiveMembers,
      todayAttendance,
      todayCollections: Number(todayCollections._sum.amount ?? 0),
      monthlyCollections: Number(monthlyCollections._sum.amount ?? 0),
      yosFitnessCollections: Number(yosFitnessMonthly._sum.amount ?? 0),
      yosStudioCollections: Number(yosStudioMonthly._sum.amount ?? 0),
      employeePresentToday,
    },
    recentAttendance: recentAttendance.map((r) => ({
      date: formatDate(r.date),
      count: Number(r.count),
    })),
    expiringMembers,
    inactiveMembersList,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData(session!.user.id);

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`Welcome back, ${session!.user.name.split(" ")[0]}`}
      />
      <div className="flex-1 p-6 space-y-6">
        <DashboardStats stats={data.stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TodayAttendanceWidget trend={data.recentAttendance} />
            <CollectionsWidget
              yosFitness={data.stats.yosFitnessCollections}
              yosStudio={data.stats.yosStudioCollections}
              total={data.stats.monthlyCollections}
            />
          </div>
          <div className="space-y-6">
            <InactiveMembersAlert members={data.inactiveMembersList} />
            <RenewalsDueWidget members={data.expiringMembers} />
          </div>
        </div>
      </div>
    </>
  );
}
