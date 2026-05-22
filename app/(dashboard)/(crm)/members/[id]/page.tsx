import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MemberDetail } from "@/components/members/MemberDetail";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    include: {
      currentPackage: true,
      trainer: { select: { id: true, fullName: true, role: true, phone: true } },
      memberships: {
        include: { package: true },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        include: {
          package: { select: { name: true } },
          collectedBy: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      },
      attendances: {
        orderBy: { date: "desc" },
        take: 30,
      },
      renewalFollowUps: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!member) notFound();

  const [packages, trainers] = await Promise.all([
    prisma.package.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { isActive: true, role: { in: ["TRAINER", "MANAGER"] } },
      select: { id: true, fullName: true, role: true },
    }),
  ]);

  return (
    <>
      <Header
        title={member.fullName}
        subtitle={`${member.memberId} · ${member.status}`}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <MemberDetail
          member={member as any}
          packages={packages}
          trainers={trainers}
          userRole={session!.user.role}
          userId={session!.user.id}
        />
      </div>
    </>
  );
}
