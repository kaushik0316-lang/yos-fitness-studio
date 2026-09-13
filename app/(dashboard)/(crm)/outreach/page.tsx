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

  const cutoff7  = subDays(new Date(), 7);
  const cutoff30 = subDays(new Date(), 30);

  const members = await prisma.member.findMany({
    where: { status: MemberStatus.ACTIVE },
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
    orderBy: { lastAttendanceDate: "asc" },
  });

  const serialized = members.map(m => ({
    id:                  m.id,
    memberId:            m.memberId,
    fullName:            m.fullName,
    phone:               m.phone,
    whatsapp:            m.whatsapp,
    expiryDate:          m.expiryDate?.toISOString() ?? null,
    lastAttendanceDate:  m.lastAttendanceDate?.toISOString() ?? null,
    doNotDisturb:        m.doNotDisturb,
    trainerName:         m.trainer?.fullName ?? null,
    packageName:         m.memberships[0]?.package?.name ?? null,
  }));

  // Segment
  const inactive = serialized.filter(m =>
    !m.lastAttendanceDate || new Date(m.lastAttendanceDate) < cutoff7
  );
  const regular = serialized.filter(m =>
    m.lastAttendanceDate && new Date(m.lastAttendanceDate) >= cutoff30
  );

  return (
    <>
      <Header title="Outreach" subtitle="Send WhatsApp messages to members" />
      <div className="flex-1 overflow-y-auto p-6">
        <OutreachClient inactive={inactive} regular={regular} />
      </div>
    </>
  );
}
