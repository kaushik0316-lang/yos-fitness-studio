"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { WaType } from "@/lib/utils/waTypes";

export async function logManualWA(
  memberId: string,
  waType: WaType,
  message: string,
) {
  const session = await auth();
  const sentByName = session?.user?.name ?? "Staff";

  await prisma.messageLog.create({
    data: {
      memberId,
      channel:     "MANUAL",
      status:      "MANUAL_SEND",
      isManual:    true,
      waType,
      sentByName,
      message:     message.slice(0, 1000), // cap length
      sentAt:      new Date(),
    },
  });

  revalidatePath(`/members/${memberId}`);
}

export async function getMemberWaLogs(memberId: string) {
  return prisma.messageLog.findMany({
    where: { memberId, isManual: true, channel: "MANUAL" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      waType: true,
      sentByName: true,
      sentAt: true,
      createdAt: true,
    },
  });
}

export async function getWaLogsByType(waType: WaType, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = await prisma.messageLog.findMany({
    where: { isManual: true, channel: "MANUAL", waType, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      memberId: true,
      sentByName: true,
      sentAt: true,
      createdAt: true,
      member: { select: { fullName: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    memberName: r.member.fullName,
    sentByName: r.sentByName,
    sentAt: r.sentAt,
    createdAt: r.createdAt,
  }));
}
