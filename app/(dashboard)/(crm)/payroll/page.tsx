import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { PayrollClient } from "@/components/employees/PayrollClient";
import { CommissionsTab } from "@/components/employees/CommissionsTab";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payroll" };

type SearchParams = { month?: string; year?: string; tab?: string };

export default async function PayrollPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const today = new Date();
  const month = searchParams.month ? parseInt(searchParams.month) : today.getMonth() + 1;
  const year  = searchParams.year  ? parseInt(searchParams.year)  : today.getFullYear();

  const [records, trainers, commissions] = await Promise.all([
    prisma.payrollRecord.findMany({
      where: { month, year },
      include: { employee: { select: { fullName: true, role: true, salaryType: true, employeeId: true } } },
      orderBy: { employee: { fullName: "asc" } },
    }),
    prisma.employee.findMany({
      where: { isActive: true, role: "TRAINER" },
      select: { id: true, employeeId: true, fullName: true, salesCommissionPct: true, salesMade: {
        where: { isVoided: false, date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59),
        }},
        select: { amount: true },
      }},
      orderBy: { fullName: "asc" },
    }),
    prisma.trainerCommission.findMany({
      where: { month, year },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const salesEntries = trainers.map(t => ({
    trainerId: t.id,
    salesTotal: t.salesMade.reduce((s, p) => s + Number(p.amount), 0),
  }));

  const trainersForTab = trainers.map(t => ({
    id: t.id,
    employeeId: t.employeeId,
    fullName: t.fullName,
    salesCommissionPct: t.salesCommissionPct ? Number(t.salesCommissionPct) : null,
  }));

  return (
    <>
      <Header title="Payroll" subtitle={new Date(year, month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })} />
      <div className="flex-1 overflow-y-auto p-6">
        <PayrollClient
          records={records as any}
          month={month}
          year={year}
          userRole={session!.user.role}
          commissionsTab={
            <CommissionsTab
              trainers={trainersForTab}
              commissions={commissions as any}
              salesEntries={salesEntries}
              month={month}
              year={year}
            />
          }
        />
      </div>
    </>
  );
}
