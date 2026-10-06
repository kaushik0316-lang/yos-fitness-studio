import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { NewReceiptClient } from "@/components/receipts/NewReceiptClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Receipt" };

export default async function NewReceiptPage({ searchParams }: { searchParams: { memberId?: string; paymentType?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role } = session.user;
  if (role !== "ADMIN" && role !== "FRONT_DESK" && role !== "ACCOUNTANT") {
    redirect("/payments");
  }

  // Only the member passed in the URL is loaded; everyone else is found by search-as-you-type
  const [initialMembers, employees] = await Promise.all([
    searchParams.memberId
      ? prisma.member.findMany({
          where: { id: searchParams.memberId },
          select: { id: true, memberId: true, fullName: true, phone: true },
        })
      : Promise.resolve([]),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true, employeeId: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <>
      <Header title="New Receipt" subtitle="Record a member payment" />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <NewReceiptClient
          initialMembers={initialMembers as any}
          employees={employees}
          userId={session.user.id}
          initialMemberId={searchParams.memberId}
          initialPaymentType={searchParams.paymentType as any}
        />
      </div>
    </>
  );
}
