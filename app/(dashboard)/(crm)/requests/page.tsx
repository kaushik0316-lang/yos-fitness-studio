import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { RequestsClient } from "@/components/requests/RequestsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Requests" };

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FRONT_DESK"].includes(session.user.role)) redirect("/dashboard");

  const rows = await prisma.memberRequest.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 60,
    select: {
      id: true, kind: true, status: true, fromDate: true, toDate: true, reason: true,
      staffNote: true, handledByName: true, handledAt: true, createdAt: true,
      member: { select: { id: true, memberId: true, fullName: true, phone: true, status: true, expiryDate: true, currentPackage: { select: { name: true } } } },
    },
  });

  const requests = rows.map((r) => ({
    id: r.id,
    status: r.status,
    fromDate: r.fromDate?.toISOString() ?? null,
    toDate: r.toDate?.toISOString() ?? null,
    reason: r.reason,
    staffNote: r.staffNote,
    handledByName: r.handledByName,
    handledAt: r.handledAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    member: {
      id: r.member.id, memberId: r.member.memberId, fullName: r.member.fullName, phone: r.member.phone,
      status: r.member.status, expiryDate: r.member.expiryDate?.toISOString() ?? null,
      packageName: r.member.currentPackage?.name ?? null,
    },
  }));

  return (
    <>
      <Header title="Requests" subtitle="Pause requests from members" />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <RequestsClient requests={requests} />
      </div>
    </>
  );
}
