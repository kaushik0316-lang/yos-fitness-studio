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
      include: {
        member: { select: { id: true, memberId: true, fullName: true, phone: true, primaryCompany: true, currentPackage: { select: { name: true } } } },
        markedBy: { select: { name: true } },
      },
      orderBy: { checkInTime: "desc" },
    }),
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE },
      select: {
        id: true, memberId: true, fullName: true, phone: true, primaryCompany: true,
        lastAttendanceDate: true, expiryDate: true,
        currentPackage: { select: { name: true } },
        trainer: { select: { fullName: true } },
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.memberAttendance.count({ where: { date: { gte: todayStart, lte: todayEnd } } }),
  ]);

  // Members who have NOT checked in today
  const checkedInIds = new Set(todayAttendance.map((a) => a.memberId));
  const notCheckedIn = activeMembers.filter((m) => !checkedInIds.has(m.id));

  return (
    <>
      <Header
        title="Member Attendance"
        subtitle={`${totalToday} checked in today`}
      />
      <div className="flex-1 p-6">
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
