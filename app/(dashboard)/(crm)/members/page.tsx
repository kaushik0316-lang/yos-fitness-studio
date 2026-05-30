import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { MembersClient } from "@/components/members/MembersClient";
import { MemberStatus } from "@prisma/client";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members" };

type SearchParams = {
  search?: string;
  status?: string;
  inactive?: string;
  showGhosts?: string;
  page?: string;
  sort?: string;
};

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const page     = Number(searchParams.page ?? 1);
  const pageSize = 25;
  const skip     = (page - 1) * pageSize;

  const where: any = {};

  if (searchParams.showGhosts === "false") {
    where.memberId = { not: { startsWith: "IMP-" } };
  }

  if (searchParams.search) {
    const s = searchParams.search.trim();
    where.OR = [
      { fullName: { contains: s, mode: "insensitive" } },
      { memberId: { contains: s, mode: "insensitive" } },
      { phone: { contains: s } },
    ];
  }

  // Default to ACTIVE if no status param
  const statusParam = searchParams.status ?? "ACTIVE";
  if (statusParam && statusParam !== "ALL") {
    where.status = statusParam as MemberStatus;
  }

  if (searchParams.inactive === "true") {
    where.status = MemberStatus.ACTIVE;
    where.OR = [
      { lastAttendanceDate: { lt: subDays(new Date(), 3) } },
      { lastAttendanceDate: null },
    ];
  }

  const [members, total, packages, employees, statusCounts] = await Promise.all([
    prisma.member.findMany({
      where,
      include: {
        currentPackage: { select: { name: true } },
        trainer: { select: { id: true, fullName: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: (() => {
        switch (searchParams.sort) {
          case "id_asc":     return [{ memberId: "asc" as const }];
          case "id_desc":    return [{ memberId: "desc" as const }];
          case "name_asc":   return [{ fullName: "asc" as const }];
          case "name_desc":  return [{ fullName: "desc" as const }];
          case "join_asc":   return [{ joinDate: "asc" as const }];
          case "join_desc":  return [{ joinDate: "desc" as const }];
          case "expiry_asc": return [{ expiryDate: "asc" as const }];
          case "expiry_desc":return [{ expiryDate: "desc" as const }];
          case "visit_asc":  return [{ lastAttendanceDate: "asc" as const }];
          case "visit_desc": return [{ lastAttendanceDate: "desc" as const }];
          default:           return [{ createdAt: "desc" as const }];
        }
      })(),
      skip,
      take: pageSize,
    }),
    prisma.member.count({ where }),
    prisma.package.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { isActive: true, role: { in: ["TRAINER", "MANAGER"] } },
      select: { id: true, fullName: true, role: true },
    }),
    // Count per status (ignoring current filters for global counts)
    prisma.member.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  const countsMap: Record<string, number> = {};
  for (const row of statusCounts) countsMap[row.status] = row._count.status;

  return (
    <>
      <Header title="Members" subtitle={`${total} members`} />
      <div className="flex-1 overflow-y-auto p-6">
        <MembersClient
          members={members as any}
          total={total}
          page={page}
          pageSize={pageSize}
          packages={packages}
          trainers={employees}
          userRole={session!.user.role}
          userId={session!.user.id}
          statusCounts={countsMap}
          activeStatusFilter={statusParam}
        />
      </div>
    </>
  );
}
