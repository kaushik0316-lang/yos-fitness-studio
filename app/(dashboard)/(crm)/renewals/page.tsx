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

  const [allMembers, renewedToday, packages, trainers] = await Promise.all([
    prisma.member.findMany({
      where: {
        status: { in: [MemberStatus.EXPIRED, MemberStatus.ACTIVE] },
        expiryDate: { gte: past30Days, lte: in30Days },
      },
      select: {
        id: true, memberId: true, fullName: true, phone: true, whatsapp: true,
        expiryDate: true, lastAttendanceDate: true, status: true,
        // Membership records in the window (most accurate — explicitly recorded expiry)
        memberships: {
          where: { expiryDate: { gte: past30Days, lte: in30Days } },
          select: { id: true, expiryDate: true, package: { select: { name: true } } },
          orderBy: { expiryDate: "asc" as const },
        },
        // Payments with expiryDate — used as fallback for per-package rows
        payments: {
          where: { isVoided: false, expiryDate: { not: null } },
          orderBy: { date: "desc" as const },
          take: 20,
          select: {
            amount: true, discount: true, categoryLabel: true,
            packageId: true, date: true, expiryDate: true,
            package: { select: { name: true } },
          },
        },
        renewalFollowUps: { where: { isCompleted: false }, take: 1 },
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
    prisma.employee.findMany({ where: { role: "TRAINER", isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  type MRow = {
    id: string;
    expiryDate: Date | null;
    package: { name: string } | null;
    member: {
      id: string; memberId: string; fullName: string; phone: string; whatsapp: string | null;
      lastAttendanceDate: Date | null; status: string;
      renewalFollowUps: any[];
      // last payment for the amount display
      lastPayment: { amount: any; discount: any; categoryLabel?: string | null } | null;
    };
  };

  const rows: MRow[] = (allMembers as any[]).flatMap((m) => {
    const memberBase = {
      id: m.id, memberId: m.memberId, fullName: m.fullName,
      phone: m.phone, whatsapp: m.whatsapp,
      lastAttendanceDate: m.lastAttendanceDate, status: m.status,
      renewalFollowUps: m.renewalFollowUps,
    };

    // 1. Use Membership records if they exist in the window (most accurate)
    if (m.memberships.length > 0) {
      // Still provide amount from last payment
      const lastPayment = m.payments[0] ?? null;
      return (m.memberships as any[]).map((ms: any) => ({
        id: ms.id,
        expiryDate: ms.expiryDate,
        package: ms.package,
        member: { ...memberBase, lastPayment },
      }));
    }

    // 2. Derive per-package rows from payments (each payment has its own expiryDate)
    // Group by packageId (fall back to categoryLabel) — take latest payment per package
    const byPackage = new Map<string, any>();
    for (const pmt of m.payments as any[]) {
      if (!pmt.expiryDate) continue;
      const key = pmt.packageId ?? pmt.categoryLabel ?? "unknown";
      const existing = byPackage.get(key);
      if (!existing || new Date(pmt.date) > new Date(existing.date)) {
        byPackage.set(key, pmt);
      }
    }

    const paymentRows: MRow[] = Array.from(byPackage.values())
      .filter((pmt) => {
        const exp = new Date(pmt.expiryDate);
        return exp >= past30Days && exp <= in30Days;
      })
      .map((pmt) => ({
        id: `${m.id}-${pmt.packageId ?? pmt.categoryLabel ?? "pay"}`,
        expiryDate: new Date(pmt.expiryDate),
        package: pmt.package ?? (pmt.categoryLabel ? { name: pmt.categoryLabel } : null),
        member: { ...memberBase, lastPayment: pmt },
      }));

    if (paymentRows.length > 0) return paymentRows;

    // 3. Final fallback — member has expiryDate but no usable payment expiry data
    const lastPayment = m.payments[0] ?? null;
    return [{
      id: m.id,
      expiryDate: m.expiryDate,
      package: null,
      member: { ...memberBase, lastPayment },
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
          trainers={trainers}
          userRole={session!.user.role}
          userId={session!.user.id}
        />
      </div>
    </>
  );
}
