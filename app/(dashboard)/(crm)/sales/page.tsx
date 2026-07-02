import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SalesTab } from "@/components/employees/SalesTab";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sales" };

export default async function SalesPage() {
  const session = await auth();
  if (!session || !["ADMIN", "ACCOUNTANT"].includes(session.user.role)) redirect("/");

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const now = new Date();

  return (
    <>
      <Header title="Sales" subtitle="Track and reassign trainer sales attribution" />
      <div className="flex-1 overflow-y-auto p-6">
        <SalesTab
          allEmployees={employees}
          initMonth={now.getMonth() + 1}
          initYear={now.getFullYear()}
        />
      </div>
    </>
  );
}
