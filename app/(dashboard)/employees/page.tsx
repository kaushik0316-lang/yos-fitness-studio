import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { EmployeesClient } from "@/components/employees/EmployeesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const session = await auth();

  const employees = await prisma.employee.findMany({
    include: {
      user: { select: { email: true, role: true } },
      _count: { select: { attendances: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <>
      <Header title="Employees" subtitle={`${employees.length} staff members`} />
      <div className="flex-1 p-6">
        <EmployeesClient employees={employees as any} userRole={session!.user.role} />
      </div>
    </>
  );
}
