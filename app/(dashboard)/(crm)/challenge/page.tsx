import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { ChallengeClient } from "@/components/challenge/ChallengeClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "August Challenge" };

export default async function ChallengePage() {
  const AUG_START = new Date("2026-08-01T00:00:00.000Z");
  const AUG_END   = new Date("2026-08-31T23:59:59.999Z");

  // All attendance records in August where BOTH check-in and check-out exist
  const records = await prisma.memberAttendance.findMany({
    where: {
      date: { gte: AUG_START, lte: AUG_END },
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

  // Group by member — one valid workout per calendar day
  const byMember = new Map<string, {
    memberId: string;
    fullName: string;
    phone: string | null;
    packageName: string | null;
    days: string[]; // ISO date strings
  }>();

  const MIN_DURATION_MS = 50 * 60 * 1000;

  for (const r of records) {
    // Must be at least 50 minutes between check-in and check-out
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
    if (!entry.days.includes(dateStr)) {
      entry.days.push(dateStr);
    }
  }

  // Build leaderboard rows
  const today = new Date();
  const dayOfAug = today >= AUG_START
    ? Math.min(Math.floor((today.getTime() - AUG_START.getTime()) / 86_400_000) + 1, 31)
    : 0;
  const daysLeft = Math.max(0, 31 - dayOfAug);
  const GOAL = 27;

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
    dayOfAug,
    daysLeft,
  };

  return (
    <>
      <Header title="August Challenge" subtitle="27 workouts in 31 days — Aug 2026" />
      <div className="flex-1 overflow-y-auto p-6">
        <Link href="/attendance" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-4">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Attendance
        </Link>
        <ChallengeClient rows={rows} stats={stats} />
      </div>
    </>
  );
}
