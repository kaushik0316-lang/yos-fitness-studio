import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { MembersClient } from "@/components/members/MembersClient";
import { MemberStatus } from "@prisma/client";
import { getWaLogsByType } from "@/lib/actions/whatsapp";
import { getWaTemplates } from "@/lib/actions/waTemplates";
import { subDays } from "date-fns";

function todayMonthDay() {
  const now = new Date();
  return { month: now.getMonth() + 1, day: now.getDate() };
}

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

  const { month: todayMonth, day: todayDay } = todayMonthDay();

  const [members, total, packages, employees, statusCounts, birthdayMembers] = await Promise.all([
    prisma.member.findMany({
      where,
      include: {
        currentPackage: { select: { name: true } },
        memberships: {
          orderBy: { expiryDate: "asc" as const },
          take: 5,
          select: { package: { select: { name: true } }, expiryDate: true },
        },
        trainer: { select: { id: true, fullName: true } },
        _count: { select: { attendances: true } },
        payments: { orderBy: { date: "desc" }, take: 1, select: { categoryLabel: true } },
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
          default:           return statusParam === "EXPIRED"
                               ? [{ expiryDate: "desc" as const }]
                               : [{ createdAt: "desc" as const }];
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
    // Birthdays this week (next 7 days by month+day)
    prisma.$queryRaw<{ id: string; memberId: string; fullName: string; phone: string; whatsapp: string | null; dateOfBirth: Date }[]>`
      SELECT id, "memberId", "fullName", phone, whatsapp, "dateOfBirth"
      FROM members
      WHERE "dateOfBirth" IS NOT NULL
        AND EXTRACT(MONTH FROM "dateOfBirth") = ${todayMonth}
        AND EXTRACT(DAY FROM "dateOfBirth") BETWEEN ${todayDay} AND ${todayDay + 6}
      ORDER BY EXTRACT(DAY FROM "dateOfBirth") ASC
      LIMIT 50
    `,
  ]);

  const [birthdayWaLogs, waTemplates] = await Promise.all([getWaLogsByType("BIRTHDAY", 30), getWaTemplates()]);

  const countsMap: Record<string, number> = {};
  for (const row of statusCounts) countsMap[row.status] = row._count.status;

  return (
    <>
      <Header title="Members" subtitle={`${total} members`} />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
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
          birthdayMembers={birthdayMembers as any}
          birthdayWaLogs={birthdayWaLogs}
          waTemplates={waTemplates}
        />
      </div>
    </>
  );
}
