import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { ReportsClient } from "@/components/reports/ReportsClient";
import { Company } from "@prisma/client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

type SearchParams = { month?: string; year?: string };

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const today = new Date();
  const month = searchParams.month ? parseInt(searchParams.month) : today.getMonth() + 1;
  const year  = searchParams.year  ? parseInt(searchParams.year)  : today.getFullYear();

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd   = endOfMonth(monthStart);

  // Last 6 months for trend
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(monthStart, 5 - i);
    return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, "MMM yy") };
  });

  const [
    collectionsByMode,
    collectionsByCompany,
    memberStatusCounts,
    attendanceTrend,
    monthlyCollectionsTrend,
    topPackages,
    newMembersThisMonth,
    renewalsThisMonth,
  ] = await Promise.all([
    // Collections by payment mode this month (voided excluded)
    prisma.payment.groupBy({
      by: ["paymentMode"],
      where: { date: { gte: monthStart, lte: monthEnd }, isVoided: false },
      _sum: { amount: true },
      _count: true,
    }),
    // Collections by company this month (voided excluded)
    prisma.payment.groupBy({
      by: ["company"],
      where: { date: { gte: monthStart, lte: monthEnd }, isVoided: false },
      _sum: { amount: true },
      _count: true,
    }),
    // Member status breakdown
    prisma.member.groupBy({
      by: ["status"],
      _count: true,
    }),
    // Daily attendance this month
    prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT date, COUNT(*) as count
      FROM member_attendance
      WHERE date >= ${monthStart} AND date <= ${monthEnd}
      GROUP BY date ORDER BY date ASC
    `,
    // Monthly revenue trend (last 6 months, voided excluded)
    Promise.all(last6Months.map(async (m) => {
      const [yf, yfs] = await Promise.all([
        prisma.payment.aggregate({ where: { company: Company.YOS_FITNESS, date: { gte: m.start, lte: m.end }, isVoided: false }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: { company: Company.YOS_FITNESS_STUDIO, date: { gte: m.start, lte: m.end }, isVoided: false }, _sum: { amount: true } }),
      ]);
      return {
        label: m.label,
        yosFitness: Number(yf._sum.amount ?? 0),
        yosStudio: Number(yfs._sum.amount ?? 0),
        total: Number(yf._sum.amount ?? 0) + Number(yfs._sum.amount ?? 0),
      };
    })),
    // Top packages this month (voided excluded)
    prisma.payment.groupBy({
      by: ["packageId"],
      where: { date: { gte: monthStart, lte: monthEnd }, packageId: { not: null }, isVoided: false },
      _sum: { amount: true },
      _count: true,
      orderBy: { _count: { packageId: "desc" } },
      take: 5,
    }),
    // New members this month
    prisma.member.count({ where: { joinDate: { gte: monthStart, lte: monthEnd } } }),
    // Renewals (new memberships) this month
    prisma.membership.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
  ]);

  // Enrich top packages with names
  const packageIds = topPackages.map((p) => p.packageId!);
  const packageNames = await prisma.package.findMany({ where: { id: { in: packageIds } }, select: { id: true, name: true } });
  const pkgMap = Object.fromEntries(packageNames.map((p) => [p.id, p.name]));

  const enrichedTopPackages = topPackages.map((p) => ({
    name: pkgMap[p.packageId!] ?? "Unknown",
    count: p._count,
    revenue: Number(p._sum.amount ?? 0),
  }));

  return (
    <>
      <Header title="Reports" subtitle={`${format(monthStart, "MMMM yyyy")} · Both Companies`} />
      <div className="flex-1 overflow-y-auto p-6">
        <ReportsClient
          month={month}
          year={year}
          collectionsByMode={collectionsByMode.map((r) => ({ mode: r.paymentMode, amount: Number(r._sum.amount ?? 0), count: r._count }))}
          collectionsByCompany={collectionsByCompany.map((r) => ({ company: r.company, amount: Number(r._sum.amount ?? 0), count: r._count }))}
          memberStatusCounts={memberStatusCounts.map((r) => ({ status: r.status, count: r._count }))}
          attendanceTrend={attendanceTrend.map((r) => ({ date: format(r.date, "dd MMM"), count: Number(r.count) }))}
          monthlyCollectionsTrend={monthlyCollectionsTrend}
          topPackages={enrichedTopPackages}
          newMembersThisMonth={newMembersThisMonth}
          renewalsThisMonth={renewalsThisMonth}
          userRole={session!.user.role}
        />
      </div>
    </>
  );
}
