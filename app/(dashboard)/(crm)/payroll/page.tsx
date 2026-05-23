import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { PayrollClient } from "@/components/employees/PayrollClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payroll" };

type SearchParams = { month?: string; year?: string };

export default async function PayrollPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const today = new Date();
  const month = searchParams.month ? parseInt(searchParams.month) : today.getMonth() + 1;
  const year  = searchParams.year  ? parseInt(searchParams.year)  : today.getFullYear();

  const records = await prisma.payrollRecord.findMany({
    where: { month, year },
    include: { employee: { select: { fullName: true, role: true, salaryType: true, employeeId: true } } },
    orderBy: { employee: { fullName: "asc" } },
  });

  return (
    <>
      <Header title="Payroll" subtitle={new Date(year, month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })} />
      <div className="flex-1 overflow-y-auto p-6">
        <PayrollClient
          records={records as any}
          month={month}
          year={year}
          userRole={session!.user.role}
        />
      </div>
    </>
  );
}
