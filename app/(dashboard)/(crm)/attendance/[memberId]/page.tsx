import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { MemberAttendanceDetail } from "@/components/attendance/MemberAttendanceDetail";
import { startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Params       = { memberId: string };
type SearchParams = { month?: string; year?: string };

export default async function MemberAttendancePage({
  params, searchParams,
}: {
  params: Params; searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) return notFound();

  const now   = new Date();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;
  const year  = searchParams.year  ? parseInt(searchParams.year)  : now.getFullYear();

  const monthDate  = new Date(year, month - 1, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd   = endOfMonth(monthDate);

  const [member, records] = await Promise.all([
    prisma.member.findUnique({
      where: { id: params.memberId },
      select: {
        id: true, memberId: true, fullName: true, phone: true,
        expiryDate: true, status: true,
        currentPackage: { select: { name: true } },
      },
    }),
    prisma.memberAttendance.findMany({
      where: {
        memberId: params.memberId,
        date: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!member) return notFound();

  const serializedRecords = records.map((r) => {
    const durationMins = r.checkOutTime
      ? differenceInMinutes(r.checkOutTime, r.checkInTime)
      : null;
    return {
      id:             r.id,
      date:           r.date.toISOString().slice(0, 10),
      checkInTime:    r.checkInTime.toISOString(),
      checkOutTime:   r.checkOutTime?.toISOString() ?? null,
      autoCheckedOut: r.autoCheckedOut,
      remarks:        r.remarks,
      durationMins,
    };
  });

  const isAugust = month === 8 && year === 2026;

  return (
    <>
      <Header
        title={member.fullName}
        subtitle={`Attendance · ${new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}`}
      />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <MemberAttendanceDetail
          member={{
            ...member,
            expiryDate: member.expiryDate?.toISOString() ?? null,
            status: member.status,
          }}
          records={serializedRecords}
          month={month}
          year={year}
          isAugust={isAugust}
          userRole={session.user.role}
        />
      </div>
    </>
  );
}
