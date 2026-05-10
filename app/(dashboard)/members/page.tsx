import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { MembersClient } from "@/components/members/MembersClient";
import { Company, MemberStatus } from "@prisma/client";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members" };

type SearchParams = {
  search?: string;
  status?: string;
  company?: string;
  inactive?: string;
  page?: string;
};

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const page = Number(searchParams.page ?? 1);
  const pageSize = 25;
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (searchParams.search) {
    const s = searchParams.search.trim();
    where.OR = [
      { fullName: { contains: s, mode: "insensitive" } },
      { memberId: { contains: s, mode: "insensitive" } },
      { phone: { contains: s } },
    ];
  }

  if (searchParams.status && searchParams.status !== "ALL") {
    where.status = searchParams.status as MemberStatus;
  }

  if (searchParams.company && searchParams.company !== "ALL") {
    where.primaryCompany = searchParams.company as Company;
  }

  if (searchParams.inactive === "true") {
    where.status = MemberStatus.ACTIVE;
    where.OR = [
      { lastAttendanceDate: { lt: subDays(new Date(), 3) } },
      { lastAttendanceDate: null },
    ];
  }

  const [members, total, packages, employees] = await Promise.all([
    prisma.member.findMany({
      where,
      include: {
        currentPackage: { select: { name: true } },
        trainer: { select: { id: true, fullName: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.member.count({ where }),
    prisma.package.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { isActive: true, role: { in: ["TRAINER", "MANAGER"] } },
      select: { id: true, fullName: true, role: true },
    }),
  ]);

  return (
    <>
      <Header title="Members" subtitle={`${total} members found`} />
      <div className="flex-1 p-6">
        <MembersClient
          members={members as any}
          total={total}
          page={page}
          pageSize={pageSize}
          packages={packages}
          trainers={employees}
          userRole={session!.user.role}
          userId={session!.user.id}
        />
      </div>
    </>
  );
}
