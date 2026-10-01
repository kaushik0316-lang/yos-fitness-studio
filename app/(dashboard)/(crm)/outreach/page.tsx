import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { OutreachClient } from "@/components/members/OutreachClient";
import { MemberStatus } from "@prisma/client";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Outreach" };

export default async function OutreachPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FRONT_DESK"].includes(session.user.role)) redirect("/dashboard");

  const cutoff = subDays(new Date(), 30);
  const logSince = subDays(new Date(), 90);

  const [members, logs] = await Promise.all([
    prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        OR: [
          { lastAttendanceDate: null },
          { lastAttendanceDate: { lt: cutoff } },
        ],
      },
      select: {
        id: true, memberId: true, fullName: true, phone: true, whatsapp: true,
        expiryDate: true, lastAttendanceDate: true, doNotDisturb: true,
        trainer: { select: { fullName: true } },
        memberships: {
          orderBy: { expiryDate: "desc" },
          take: 1,
          select: { package: { select: { name: true } } },
        },
      },
      orderBy: { lastAttendanceDate: "asc" }, // least recent first
    }),
    prisma.messageLog.findMany({
      where: {
        isManual: true,
        channel: "WHATSAPP",
        createdAt: { gte: logSince },
        OR: [{ waType: "OUTREACH" }, { waType: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, memberId: true, sentByName: true, sentAt: true, createdAt: true,
        member: { select: { fullName: true } },
      },
    }),
  ]);

  const serializedMembers = members.map(m => ({
    id:                 m.id,
    memberId:           m.memberId,
    fullName:           m.fullName,
    phone:              m.phone,
    whatsapp:           m.whatsapp,
    expiryDate:         m.expiryDate?.toISOString() ?? null,
    lastAttendanceDate: m.lastAttendanceDate?.toISOString() ?? null,
    doNotDisturb:       m.doNotDisturb,
    trainerName:        m.trainer?.fullName ?? null,
    packageName:        m.memberships[0]?.package?.name ?? null,
  }));

  const serializedLogs = logs.map(l => ({
    id:         l.id,
    memberId:   l.memberId,
    memberName: l.member?.fullName ?? "Unknown",
    sentByName: l.sentByName,
    sentAt:     l.sentAt?.toISOString() ?? null,
    createdAt:  l.createdAt.toISOString(),
  }));

  return (
    <>
      <Header title="Outreach" subtitle="Send WhatsApp Business messages to members" />
      <div className="flex-1 overflow-y-auto p-6">
        <OutreachClient members={serializedMembers} logs={serializedLogs} />
      </div>
    </>
  );
}
