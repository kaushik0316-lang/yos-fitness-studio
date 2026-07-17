import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { AttendanceClient } from "@/components/attendance/AttendanceClient";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from "date-fns";
import { MemberStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attendance" };

type SearchParams = { date?: string };

export default async function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();

  const selectedDate = searchParams.date ? new Date(searchParams.date) : new Date();
  const dayStart  = startOfDay(selectedDate);
  const dayEnd    = endOfDay(selectedDate);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const [dayAttendance, activeMembers, weekAttendance] = await Promise.all([
    prisma.memberAttendance.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      select: {
        id: true, checkInTime: true, checkOutTime: true, autoCheckedOut: true, remarks: true,
        member: {
          select: {
            id: true, memberId: true, fullName: true, phone: true, gender: true,
            expiryDate: true, lastAttendanceDate: true,
            currentPackage: { select: { name: true } },
            memberships: {
              orderBy: { expiryDate: "desc" as const }, take: 3,
              select: { package: { select: { name: true } }, expiryDate: true },
            },
            trainer: { select: { fullName: true } },
          },
        },
        markedBy: { select: { name: true } },
      },
      orderBy: { checkInTime: "desc" },
    }),
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE },
      select: {
        id: true, memberId: true, fullName: true, phone: true, gender: true,
        lastAttendanceDate: true, expiryDate: true,
        currentPackage: { select: { name: true } },
        memberships: {
          orderBy: { expiryDate: "desc" as const }, take: 3,
          select: { package: { select: { name: true } }, expiryDate: true },
        },
        trainer: { select: { fullName: true } },
      },
      orderBy: { fullName: "asc" },
    }),
    // This week's attendance count per member
    prisma.memberAttendance.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
      select: { memberId: true },
    }),
  ]);

  const checkedInIds = new Set(dayAttendance.map((a) => a.member.id));
  const notCheckedIn = activeMembers.filter((m) => !checkedInIds.has(m.id));

  // Weekly visit count per member
  const weekVisitsMap: Record<string, number> = {};
  for (const r of weekAttendance) {
    weekVisitsMap[r.memberId] = (weekVisitsMap[r.memberId] ?? 0) + 1;
  }

  // Serialize dates
  function serializeAttendance(a: (typeof dayAttendance)[0]) {
    return {
      ...a,
      checkInTime:  a.checkInTime.toISOString(),
      checkOutTime: a.checkOutTime?.toISOString() ?? null,
      member: {
        ...a.member,
        expiryDate:          a.member.expiryDate?.toISOString() ?? null,
        lastAttendanceDate:  a.member.lastAttendanceDate?.toISOString() ?? null,
        memberships: a.member.memberships.map((ms) => ({
          ...ms,
          expiryDate: ms.expiryDate?.toISOString() ?? null,
        })),
      },
    };
  }
  function serializeMember(m: (typeof activeMembers)[0]) {
    return {
      ...m,
      expiryDate:         m.expiryDate?.toISOString() ?? null,
      lastAttendanceDate: m.lastAttendanceDate?.toISOString() ?? null,
      memberships: m.memberships.map((ms) => ({
        ...ms,
        expiryDate: ms.expiryDate?.toISOString() ?? null,
      })),
    };
  }

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <>
      <Header
        title="Member Attendance"
        subtitle={isToday ? `${dayAttendance.length} checked in today` : format(selectedDate, "d MMM yyyy")}
      />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <AttendanceClient
          todayAttendance={dayAttendance.map(serializeAttendance) as any}
          notCheckedIn={notCheckedIn.map(serializeMember) as any}
          totalActive={activeMembers.length}
          userId={session!.user.id}
          userRole={session!.user.role}
          selectedDate={format(selectedDate, "yyyy-MM-dd")}
          isToday={isToday}
          weekVisitsMap={weekVisitsMap}
        />
      </div>
    </>
  );
}
