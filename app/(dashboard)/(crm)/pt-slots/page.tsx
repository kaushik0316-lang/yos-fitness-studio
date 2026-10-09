import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { PtSlotsClient } from "@/components/pt/PtSlotsClient";
import { getPtConfig, istToday, ymd, type PtWindows } from "@/lib/pt";

export const dynamic = "force-dynamic";
export const metadata = { title: "PT Sessions" };

export default async function PtSlotsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FRONT_DESK"].includes(session.user.role)) redirect("/dashboard");

  const since = new Date(istToday().getTime() - 30 * 86_400_000);
  const [config, trainers, bookings] = await Promise.all([
    getPtConfig(),
    prisma.employee.findMany({
      where: { isActive: true, role: "TRAINER" },
      select: { id: true, fullName: true, ptEnabled: true, ptWindows: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.ptBooking.findMany({
      where: { date: { gte: since }, status: { not: "EXPIRED" } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: {
        id: true, status: true, date: true, startTime: true, durationMins: true, price: true, staffNote: true, paymentId: true,
        payUrl: true, expiresAt: true, respondedByName: true,
        trainer: { select: { fullName: true, phone: true } },
        member: { select: { id: true, memberId: true, fullName: true, phone: true } },
      },
    }),
  ]);

  return (
    <>
      <Header title="PT Sessions" subtitle="Members book and pay for personal training one session at a time" />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <PtSlotsClient
          isAdmin={session.user.role === "ADMIN"}
          config={{ enabled: config.enabled, price: config.price, leadHours: config.leadHours, daysAhead: config.daysAhead }}
          trainers={trainers.map((t) => ({ id: t.id, fullName: t.fullName, ptEnabled: t.ptEnabled, windows: (t.ptWindows as PtWindows | null) ?? {} }))}
          bookings={bookings.map((b) => ({
            id: b.id, status: b.status, date: ymd(b.date), time: b.startTime, durationMins: b.durationMins, price: b.price,
            staffNote: b.staffNote, paymentId: b.paymentId, trainer: b.trainer.fullName, trainerPhone: b.trainer.phone,
            payUrl: b.payUrl, expiresAt: b.expiresAt?.toISOString() ?? null, respondedByName: b.respondedByName,
            member: { id: b.member.id, memberId: b.member.memberId, fullName: b.member.fullName, phone: b.member.phone },
          }))}
          today={ymd(istToday())}
        />
      </div>
    </>
  );
}
