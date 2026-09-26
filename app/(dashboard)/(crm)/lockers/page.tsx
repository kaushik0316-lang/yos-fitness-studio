import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { LockersClient } from "@/components/lockers/LockersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lockers" };

export default async function LockersPage() {
  const session = await auth();

  const [lockers, employees] = await Promise.all([
    prisma.locker.findMany({
      orderBy: { number: "asc" },
      include: {
        member: { select: { id: true, fullName: true, memberId: true, phone: true } },
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, employeeId: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const serialized = lockers.map((l) => ({
    id: l.id,
    number: l.number,
    status: l.status,
    holderName: l.holderName,
    allocatedDate: l.allocatedDate ? l.allocatedDate.toISOString() : null,
    member: l.member,
    employee: l.employee,
  }));

  return (
    <div>
      <Header title="Lockers" subtitle="Assign, track and manage locker allocations" />
      <div className="p-6">
        <LockersClient
          lockers={serialized}
          employees={employees}
          isAdmin={session?.user?.role === "ADMIN"}
        />
      </div>
    </div>
  );
}
