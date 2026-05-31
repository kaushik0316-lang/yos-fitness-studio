import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { PaymentsClient } from "@/components/payments/PaymentsClient";
import { ExportButtons } from "@/components/payments/ExportButtons";
import { Company } from "@prisma/client";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

type SearchParams = {
  company?: string; mode?: string; page?: string; dateFilter?: string;
  search?: string; paymentType?: string; sort?: string;
  dateFrom?: string; dateTo?: string;
};

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const page = Number(searchParams.page ?? 1);
  const pageSize = 30;
  const skip = (page - 1) * pageSize;
  const today = new Date();

  const where: any = {};

  if (searchParams.company && searchParams.company !== "ALL")
    where.company = searchParams.company as Company;

  if (searchParams.mode && searchParams.mode !== "ALL")
    where.paymentMode = searchParams.mode;

  if (searchParams.paymentType && searchParams.paymentType !== "ALL")
    where.paymentType = searchParams.paymentType;

  if (searchParams.search) {
    const s = searchParams.search.trim();
    const receiptNum = parseInt(s.replace(/^#/, ""));
    where.OR = [
      { member: { fullName: { contains: s, mode: "insensitive" } } },
      { member: { memberId: { contains: s, mode: "insensitive" } } },
      { member: { phone: { contains: s } } },
      ...(!isNaN(receiptNum) ? [{ receiptNumber: receiptNum }] : []),
    ];
  }

  // Date filters
  if (searchParams.dateFrom || searchParams.dateTo) {
    where.date = {};
    if (searchParams.dateFrom) where.date.gte = startOfDay(parseISO(searchParams.dateFrom));
    if (searchParams.dateTo)   where.date.lte = endOfDay(parseISO(searchParams.dateTo));
  } else if (searchParams.dateFilter === "today") {
    where.date = { gte: startOfDay(today), lte: endOfDay(today) };
  } else if (searchParams.dateFilter === "week") {
    where.date = { gte: startOfWeek(today, { weekStartsOn: 1 }), lte: endOfWeek(today, { weekStartsOn: 1 }) };
  } else if (searchParams.dateFilter === "month") {
    where.date = { gte: startOfMonth(today), lte: endOfMonth(today) };
  }

  // Sort — always add receiptNumber as tiebreaker within the same date
  const orderBy: any =
    searchParams.sort === "amount_desc" ? [{ amount: "desc" }, { receiptNumber: "desc" }] :
    searchParams.sort === "amount_asc"  ? [{ amount: "asc"  }, { receiptNumber: "desc" }] :
    searchParams.sort === "receipt_asc" ? [{ receiptNumber: "asc"  }] :
    searchParams.sort === "receipt_desc"? [{ receiptNumber: "desc" }] :
    searchParams.sort === "date_asc"    ? [{ date: "asc"  }, { receiptNumber: "asc"  }] :
    [{ date: "desc" }, { receiptNumber: "desc" }];

  // When a filter is active, compute per-company stats for the current filter
  const hasFilter = !!(searchParams.dateFilter || searchParams.dateFrom || searchParams.dateTo
    || searchParams.company || searchParams.mode || searchParams.paymentType || searchParams.search);

  const [payments, total, totalAmount, todayStats, monthStats, filteredStats, packages, members] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        member: { select: { id: true, memberId: true, fullName: true, phone: true } },
        package: { select: { name: true } },
        collectedBy: { select: { name: true } },
        soldBy: { select: { fullName: true, employeeId: true } },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
    prisma.payment.groupBy({
      by: ["company"],
      where: { date: { gte: startOfDay(today), lte: endOfDay(today) } },
      _sum: { amount: true }, _count: true,
    }),
    prisma.payment.groupBy({
      by: ["company"],
      where: { date: { gte: startOfMonth(today), lte: endOfMonth(today) } },
      _sum: { amount: true }, _count: true,
    }),
    hasFilter
      ? prisma.payment.groupBy({ by: ["company"], where, _sum: { amount: true }, _count: true })
      : Promise.resolve(null),
    prisma.package.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({
      where: { memberId: { not: { startsWith: "IMP-" } } },
      select: { id: true, memberId: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <>
      <Header title="Payments" subtitle="Complete payment history" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex justify-end items-center gap-3 mb-4">
          <ExportButtons />
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
          totalAmount={Number(totalAmount._sum.amount ?? 0)}
          page={page}
          pageSize={pageSize}
          todayStats={todayStats}
          monthStats={monthStats}
          filteredStats={filteredStats as any}
          filteredLabel={
            searchParams.dateFilter === "today" ? "Today" :
            searchParams.dateFilter === "week"  ? "This Week" :
            searchParams.dateFilter === "month" ? "This Month" :
            searchParams.dateFrom || searchParams.dateTo ? "Selected Range" :
            hasFilter ? "Filtered" : undefined
          }
          packages={packages}
          members={members as any}
          userRole={session!.user.role}
          userId={session!.user.id}
          dateFilter={searchParams.dateFilter}
          currentSort={searchParams.sort ?? "date_desc"}
        />
      </div>
    </>
  );
}
