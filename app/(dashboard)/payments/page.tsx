import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { PaymentsClient } from "@/components/payments/PaymentsClient";
import { Company } from "@prisma/client";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

type SearchParams = { company?: string; mode?: string; page?: string };

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const page = Number(searchParams.page ?? 1);
  const pageSize = 30;
  const skip = (page - 1) * pageSize;
  const today = new Date();

  const where: any = {};
  if (searchParams.company && searchParams.company !== "ALL") {
    where.company = searchParams.company as Company;
  }
  if (searchParams.mode && searchParams.mode !== "ALL") {
    where.paymentMode = searchParams.mode;
  }

  const [payments, total, todayStats, monthStats, packages, members] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        member: { select: { id: true, memberId: true, fullName: true, phone: true } },
        package: { select: { name: true } },
        collectedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
    // Today's stats by company
    prisma.payment.groupBy({
      by: ["company"],
      where: { date: { gte: startOfDay(today), lte: endOfDay(today) } },
      _sum: { amount: true },
      _count: true,
    }),
    // Monthly stats by company
    prisma.payment.groupBy({
      by: ["company"],
      where: { date: { gte: startOfMonth(today), lte: endOfMonth(today) } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.package.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({
      where: { status: { in: ["ACTIVE", "EXPIRED"] } },
      select: { id: true, memberId: true, fullName: true, primaryCompany: true },
      orderBy: { fullName: "asc" },
      take: 500,
    }),
  ]);

  return (
    <>
      <Header title="Payments" subtitle="All transactions across both companies" />
      <div className="flex-1 p-6">
        <div className="flex justify-end mb-4">
          <Link
            href="/payments/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-bold text-white transition-colors shadow-md shadow-orange-200"
          >
            + New Receipt
          </Link>
        </div>
        <PaymentsClient
          payments={payments as any}
          total={total}
          page={page}
          pageSize={pageSize}
          todayStats={todayStats}
          monthStats={monthStats}
          packages={packages}
          members={members as any}
          userRole={session!.user.role}
          userId={session!.user.id}
        />
        </div>
    </>
  );
}
