import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { AttendanceClient } from "@/components/attendance/AttendanceClient";
import { startOfDay, endOfDay } from "date-fns";
import { MemberStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const session = await auth();
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const [todayAttendance, activeMembers, totalToday] = await Promise.all([
    prisma.memberAttendance.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      select: {
        id: true, checkInTime: true, checkOutTime: true, autoCheckedOut: true, remarks: true,
        member: { select: { id: true, memberId: true, fullName: true, phone: true, currentPackage: { select: { name: true } }, memberships: { orderBy: { expiryDate: "asc" as const }, take: 5, select: { package: { select: { name: true } }, expiryDate: true } } } },
        markedBy: { select: { name: true } },
      },
      orderBy: { checkInTime: "desc" },
    }),
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE },
      select: {
        id: true, memberId: true, fullName: true, phone: true,
        lastAttendanceDate: true, expiryDate: true,
        currentPackage: { select: { name: true } },
        memberships: {
          orderBy: { expiryDate: "asc" as const },
          take: 5,
          select: { package: { select: { name: true } }, expiryDate: true },
        },
        trainer: { select: { fullName: true } },
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.memberAttendance.count({ where: { date: { gte: todayStart, lte: todayEnd } } }),
  ]);

  // Members who have NOT checked in today
  const checkedInIds = new Set(todayAttendance.map((a) => a.member.id));
  const notCheckedIn = activeMembers.filter((m) => !checkedInIds.has(m.id));

  return (
    <>
      <Header
        title="Member Attendance"
        subtitle={`${totalToday} checked in today`}
      />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <AttendanceClient
          todayAttendance={todayAttendance as any}
          notCheckedIn={notCheckedIn as any}
          totalActive={activeMembers.length}
          userId={session!.user.id}
          userRole={session!.user.role}
        />
      </div>
    </>
  );
}
