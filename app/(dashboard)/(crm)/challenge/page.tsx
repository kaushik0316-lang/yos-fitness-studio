import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { ChallengeClient } from "@/components/challenge/ChallengeClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { startOfMonth, endOfMonth, getDaysInMonth, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ChallengePage() {
  const now        = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd   = endOfMonth(now);
  const daysInMonth = getDaysInMonth(now);
  const monthName  = format(now, "MMMM");
  const year       = now.getFullYear();

  // Goal: daysInMonth minus 4 buffer (31→27, 30→26, 29→25, 28→24)
  const GOAL = daysInMonth - 4;

  const records = await prisma.memberAttendance.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      checkOutTime: { not: null },
    },
    include: {
      member: {
        select: {
          id: true,
          memberId: true,
          fullName: true,
          phone: true,
          currentPackage: { select: { name: true } },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  const byMember = new Map<string, {
    memberId: string;
    fullName: string;
    phone: string | null;
    packageName: string | null;
    days: string[];
  }>();

  const MIN_DURATION_MS = 50 * 60 * 1000;

  for (const r of records) {
    if (!r.checkOutTime || r.checkOutTime.getTime() - r.checkInTime.getTime() < MIN_DURATION_MS) continue;
    const id = r.member.id;
    if (!byMember.has(id)) {
      byMember.set(id, {
        memberId:    r.member.memberId,
        fullName:    r.member.fullName,
        phone:       r.member.phone,
        packageName: r.member.currentPackage?.name ?? null,
        days:        [],
      });
    }
    const dateStr = r.date.toISOString().slice(0, 10);
    const entry = byMember.get(id)!;
    if (!entry.days.includes(dateStr)) entry.days.push(dateStr);
  }

  const dayOfMonth = Math.min(now.getDate(), daysInMonth);
  const daysLeft   = Math.max(0, daysInMonth - dayOfMonth);

  const rows = Array.from(byMember.values())
    .map((m) => {
      const count     = m.days.length;
      const needed    = Math.max(0, GOAL - count);
      const onTrack   = needed <= daysLeft;
      const completed = count >= GOAL;
      return { ...m, count, needed, onTrack, completed };
    })
    .sort((a, b) => b.count - a.count || a.fullName.localeCompare(b.fullName));

  const stats = {
    totalParticipants: rows.length,
    completed:         rows.filter((r) => r.completed).length,
    onTrack:           rows.filter((r) => r.onTrack && !r.completed).length,
    atRisk:            rows.filter((r) => !r.onTrack && !r.completed).length,
    dayOfMonth,
    daysLeft,
    daysInMonth,
  };

  return (
    <>
      <Header title={`${monthName} Challenge`} subtitle={`${GOAL} workouts in ${daysInMonth} days — ${monthName} ${year}`} />
      <div className="flex-1 overflow-y-auto p-6">
        <Link href="/attendance" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-4">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Attendance
        </Link>
        <ChallengeClient rows={rows} stats={stats} goal={GOAL} monthName={monthName} />
      </div>
    </>
  );
}
