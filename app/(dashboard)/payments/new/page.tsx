import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { NewReceiptClient } from "@/components/receipts/NewReceiptClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Receipt" };

export default async function NewReceiptPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role } = session.user;
  if (role !== "ADMIN" && role !== "FRONT_DESK" && role !== "ACCOUNTANT") {
    redirect("/payments");
  }

  const members = await prisma.member.findMany({
    where: { status: { in: ["ACTIVE", "EXPIRED", "PROSPECT", "FROZEN"] } },
    select: { id: true, memberId: true, fullName: true, phone: true, primaryCompany: true },
    orderBy: { fullName: "asc" },
    take: 1000,
  });

  return (
    <>
      <Header title="New Receipt" subtitle="Create a digital receipt for a member payment" />
      <div className="flex-1 p-6">
        <NewReceiptClient members={members as any} userId={session.user.id} />
      </div>
    </>
  );
}
