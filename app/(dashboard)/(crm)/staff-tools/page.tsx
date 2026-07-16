import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { StaffToolsClient } from "@/components/staff/StaffToolsClient";
import { REGISTRATION_FORM_URL } from "@/lib/site-config";
import { startOfDay, endOfDay, addDays, startOfMonth, subDays } from "date-fns";
import { Company, MemberStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview" };

export default async function StaffToolsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const today = new Date();
  const monthStart = startOfMonth(today);

  const [
    todayPayments,
    monthPayments,
    yosFitnessMonthly,
    yosStudioMonthly,
    expiringThisWeek,
    expiringToday,
    activeMembers,
    recentAttendance,
    inactiveMembersList,
    staffCheckedIn,
  ] = await Promise.all([
    // Today's collections
    prisma.payment.aggregate({
      where: { isVoided: false, date: { gte: startOfDay(today), lte: endOfDay(today) } },
      _sum: { amount: true },
      _count: true,
    }),
    // This month's collections
    prisma.payment.aggregate({
      where: { isVoided: false, date: { gte: monthStart, lte: endOfDay(today) } },
      _sum: { amount: true },
      _count: true,
    }),
    // YF monthly
    prisma.payment.aggregate({
      where: { isVoided: false, company: Company.YOS_FITNESS, date: { gte: monthStart, lte: endOfDay(today) } },
      _sum: { amount: true },
    }),
    // YFS monthly
    prisma.payment.aggregate({
      where: { isVoided: false, company: Company.YOS_FITNESS_STUDIO, date: { gte: monthStart, lte: endOfDay(today) } },
      _sum: { amount: true },
    }),
    // Expiring in next 7 days (still active)
    prisma.member.count({
      where: { expiryDate: { gte: startOfDay(today), lte: addDays(today, 7) }, status: "ACTIVE" },
    }),
    // Expiring today
    prisma.member.count({
      where: { expiryDate: { gte: startOfDay(today), lte: endOfDay(today) }, status: "ACTIVE" },
    }),
    // Total active members
    prisma.member.count({ where: { status: "ACTIVE" } }),
    // 7-day attendance trend
    prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT date, COUNT(*) as count
      FROM member_attendance
      WHERE date >= ${subDays(today, 6)}
      GROUP BY date
      ORDER BY date ASC
    `,
    // Inactive members (4+ days no check-in)
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
        lastAttendanceDate: true, expiryDate: true,
        trainer: { select: { fullName: true } },
      },
      orderBy: { lastAttendanceDate: "asc" },
      take: 8,
    }),
    // Staff still checked in (no checkout today)
    prisma.attendanceShift.findMany({
      where: {
        checkOutTime: null,
        checkInTime: { gte: startOfDay(today), lte: endOfDay(today) },
      },
      include: {
        attendance: {
          include: {
            employee: { select: { id: true, fullName: true, employeeId: true, role: true } },
          },
        },
      },
      orderBy: { checkInTime: "asc" },
    }),
  ]);

  // Members expiring soon (for the list)
  const expiringSoonList = await prisma.member.findMany({
    where: {
      expiryDate: { gte: today, lte: addDays(today, 7) },
      status: { in: ["ACTIVE", "EXPIRED"] },
    },
    select: { id: true, memberId: true, fullName: true, phone: true, expiryDate: true },
    orderBy: { expiryDate: "asc" },
    take: 10,
  });

  return (
    <>
      <Header title="Overview" subtitle="Your gym at a glance" />
      <div className="flex-1 overflow-y-auto p-6">
        <StaffToolsClient
          formUrl={REGISTRATION_FORM_URL}
          userName={session.user.name ?? "Staff"}
          userRole={session.user.role ?? "FRONT_DESK"}
          todayPaymentCount={todayPayments._count}
          todayPaymentTotal={Number(todayPayments._sum.amount ?? 0)}
          monthPaymentTotal={Number(monthPayments._sum.amount ?? 0)}
          monthPaymentCount={monthPayments._count}
          yosFitnessMonthly={Number(yosFitnessMonthly._sum.amount ?? 0)}
          yosStudioMonthly={Number(yosStudioMonthly._sum.amount ?? 0)}
          expiringThisWeek={expiringThisWeek}
          expiringToday={expiringToday}
          activeMembers={activeMembers}
          expiringSoonList={expiringSoonList.map((m) => ({
            ...m,
            expiryDate: m.expiryDate ? m.expiryDate.toISOString() : null,
          }))}
          attendanceTrend={recentAttendance.map((r) => ({
            date: formatDate(r.date),
            count: Number(r.count),
          }))}
          inactiveMembers={inactiveMembersList}
          staffCheckedIn={staffCheckedIn.map((s) => ({
            shiftId: s.id,
            employeeId: s.attendance.employee.employeeId,
            fullName: s.attendance.employee.fullName,
            role: s.attendance.employee.role,
            checkInTime: s.checkInTime.toISOString(),
          }))}
        />
      </div>
    </>
  );
}
