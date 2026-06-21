import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { RenewalsClient } from "@/components/renewals/RenewalsClient";
import { MemberStatus } from "@prisma/client";
import { addDays, startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Renewals" };

export default async function RenewalsPage() {
  const session = await auth();
  const today      = startOfDay(new Date());
  const in1Day     = endOfDay(addDays(today, 1));
  const in3Days    = endOfDay(addDays(today, 3));
  const in7Days    = endOfDay(addDays(today, 7));
  const in30Days   = endOfDay(addDays(today, 30));
  const past30Days = startOfDay(addDays(today, -30));
  const endOfToday = endOfDay(today);

  // Fetch all members whose expiryDate is within the window we care about.
  // Include their memberships so we can expand into per-membership rows.
  const [allMembers, renewedToday, packages] = await Promise.all([
    prisma.member.findMany({
      where: {
        status: { in: [MemberStatus.EXPIRED, MemberStatus.ACTIVE] },
        expiryDate: { gte: past30Days, lte: in30Days },
      },
      select: {
        id: true, memberId: true, fullName: true, phone: true, whatsapp: true,
        expiryDate: true, lastAttendanceDate: true, status: true,
        currentPackage: { select: { name: true } },
        // Fetch memberships in the same window so we can expand multi-package members
        memberships: {
          where: { expiryDate: { gte: past30Days, lte: in30Days } },
          select: { id: true, expiryDate: true, package: { select: { name: true } } },
          orderBy: { expiryDate: "asc" as const },
        },
        renewalFollowUps: { where: { isCompleted: false }, take: 1 },
        payments: {
          where: { isVoided: false },
          orderBy: { date: "desc" as const },
          take: 1,
          select: { amount: true, discount: true, categoryLabel: true },
        },
      },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.membership.findMany({
      where: { createdAt: { gte: startOfDay(today), lte: endOfDay(today) } },
      include: {
        member: { select: { memberId: true, fullName: true } },
        package: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.package.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  // Expand each member into one row per membership.
  // If the member has no membership records in the window, fall back to member.expiryDate.
  type MRow = {
    id: string;
    expiryDate: Date | null;
    package: { name: string } | null;
    member: {
      id: string; memberId: string; fullName: string; phone: string; whatsapp: string | null;
      lastAttendanceDate: Date | null; status: string;
      renewalFollowUps: any[]; payments: any[];
    };
  };

  const rows: MRow[] = allMembers.flatMap((m) => {
    const memberInfo = {
      id: m.id, memberId: m.memberId, fullName: m.fullName,
      phone: m.phone, whatsapp: m.whatsapp,
      lastAttendanceDate: m.lastAttendanceDate, status: m.status,
      renewalFollowUps: m.renewalFollowUps, payments: m.payments,
    };
    if (m.memberships.length > 0) {
      return m.memberships.map((ms) => ({
        id: ms.id,
        expiryDate: ms.expiryDate,
        package: ms.package,
        member: memberInfo,
      }));
    }
    // No membership records — treat member.expiryDate as the single row
    return [{
      id: m.id,
      expiryDate: m.expiryDate,
      package: m.currentPackage,
      member: memberInfo,
    }];
  });

  function inRange(r: MRow, from: Date, to: Date) {
    return r.expiryDate != null && r.expiryDate >= from && r.expiryDate <= to;
  }

  const expiredMemberships = rows
    .filter((r) => inRange(r, past30Days, endOfToday))
    .sort((a, b) => new Date(b.expiryDate!).getTime() - new Date(a.expiryDate!).getTime());

  const expiring1 = rows
    .filter((r) => inRange(r, today, in1Day))
    .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

  const expiring3 = rows
    .filter((r) => r.expiryDate != null && r.expiryDate > in1Day && r.expiryDate <= in3Days)
    .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

  const expiring7 = rows
    .filter((r) => r.expiryDate != null && r.expiryDate > in3Days && r.expiryDate <= in7Days)
    .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

  const expiring30 = rows
    .filter((r) => inRange(r, today, in30Days))
    .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

  return (
    <>
      <Header title="Renewals" subtitle="Memberships expiring soon" />
      <div className="flex-1 overflow-y-auto p-6">
        <RenewalsClient
          expiredMemberships={expiredMemberships as any}
          expiring1={expiring1 as any}
          expiring3={expiring3 as any}
          expiring7={expiring7 as any}
          expiring30={expiring30 as any}
          renewedToday={renewedToday as any}
          packages={packages}
          userRole={session!.user.role}
          userId={session!.user.id}
        />
      </div>
    </>
  );
}
