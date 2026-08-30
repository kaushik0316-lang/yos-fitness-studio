"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type WaType =
  | "BIRTHDAY"
  | "RENEWAL"
  | "WELCOME"
  | "PAYMENT"
  | "ENQUIRY"
  | "TERMS"
  | "GENERAL";

export const WA_TYPE_LABELS: Record<WaType, string> = {
  BIRTHDAY: "Birthday Wish",
  RENEWAL:  "Renewal Reminder",
  WELCOME:  "Welcome Message",
  PAYMENT:  "Payment Receipt",
  ENQUIRY:  "Enquiry Follow-up",
  TERMS:    "Terms & Conditions",
  GENERAL:  "General Message",
};

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
