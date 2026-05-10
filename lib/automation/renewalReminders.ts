import { prisma } from "@/lib/prisma";
import { MemberStatus, AutomationTrigger, MessageChannel, MessageStatus } from "@prisma/client";
import { addDays, startOfDay, endOfDay, format } from "date-fns";
import { getActiveProvider } from "@/lib/messaging/provider";
import { interpolate, DEFAULT_TEMPLATES } from "@/lib/messaging/templates";

const RENEWAL_RULES: { daysBeforeExpiry: number; trigger: AutomationTrigger }[] = [
  { daysBeforeExpiry: 7, trigger: AutomationTrigger.EXPIRY_7_DAYS },
  { daysBeforeExpiry: 3, trigger: AutomationTrigger.EXPIRY_3_DAYS },
  { daysBeforeExpiry: 1, trigger: AutomationTrigger.EXPIRY_1_DAY },
  { daysBeforeExpiry: 0, trigger: AutomationTrigger.EXPIRY_TODAY },
];

export async function runRenewalReminders(): Promise<{
  processed: number;
  messagesQueued: number;
  errors: string[];
}> {
  const today = new Date();
  let processed = 0;
  let messagesQueued = 0;
  const errors: string[] = [];

  for (const rule of RENEWAL_RULES) {
    const targetDate = addDays(today, rule.daysBeforeExpiry);
    const dayStart = startOfDay(targetDate);
    const dayEnd   = endOfDay(targetDate);

    const members = await prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        expiryDate: { gte: dayStart, lte: dayEnd },
      },
      include: {
        currentPackage: { select: { name: true } },
        messageLogs: {
          where: {
            trigger: rule.trigger,
            createdAt: { gte: startOfDay(today) },
          },
          take: 1,
        },
      },
    });

    for (const member of members) {
      if (!member.whatsapp && !member.phone) continue;
      if (member.messageLogs.length > 0) continue; // already sent today

      processed++;

      try {
        const template = await prisma.messageTemplate.findFirst({
          where: { trigger: rule.trigger, isActive: true },
        });

        const bodyTemplate = template?.body ?? DEFAULT_TEMPLATES[rule.trigger as keyof typeof DEFAULT_TEMPLATES] ?? "";
        const message = interpolate(bodyTemplate, {
          name:           member.fullName.split(" ")[0],
          expiry_date:    member.expiryDate ? format(member.expiryDate, "dd MMM yyyy") : "—",
          days_to_expiry: rule.daysBeforeExpiry,
          package_name:   member.currentPackage?.name ?? "your membership",
          gym_name:       member.primaryCompany === "YOS_FITNESS" ? "Yos Fitness" : "Yos Fitness Studio",
        });

        const phone = member.whatsapp ?? member.phone;
        const provider = getActiveProvider();
        const result = await provider.send({
          to: phone.startsWith("+") ? phone : `+91${phone}`,
          message,
          channel: "WHATSAPP",
        });

        await prisma.messageLog.create({
          data: {
            memberId:     member.id,
            templateId:   template?.id,
            message,
            channel:      MessageChannel.WHATSAPP,
            status:       result.success ? MessageStatus.SENT : MessageStatus.FAILED,
            sentAt:       result.success ? new Date() : undefined,
            failureReason: result.error,
            trigger:      rule.trigger,
            isManual:     false,
          },
        });

        if (result.success) messagesQueued++;
      } catch (e: any) {
        errors.push(`Member ${member.memberId}: ${e.message}`);
      }
    }
  }

  // Also handle already-expired members (separate reminder)
  const expiredWithNoRecentMsg = await prisma.member.findMany({
    where: {
      status: MemberStatus.EXPIRED,
      messageLogs: {
        none: {
          trigger: AutomationTrigger.ALREADY_EXPIRED,
          createdAt: { gte: addDays(today, -7) }, // don't spam — max once per 7 days
        },
      },
    },
    take: 20,
  });

  for (const member of expiredWithNoRecentMsg) {
    if (!member.whatsapp && !member.phone) continue;
    processed++;
    try {
      const template = await prisma.messageTemplate.findFirst({
        where: { trigger: AutomationTrigger.ALREADY_EXPIRED, isActive: true },
      });
      const message = interpolate(
        template?.body ?? DEFAULT_TEMPLATES.ALREADY_EXPIRED,
        {
          name:        member.fullName.split(" ")[0],
          expiry_date: member.expiryDate ? format(member.expiryDate, "dd MMM yyyy") : "—",
          gym_name:    member.primaryCompany === "YOS_FITNESS" ? "Yos Fitness" : "Yos Fitness Studio",
        }
      );
      const phone = member.whatsapp ?? member.phone;
      const provider = getActiveProvider();
      const result = await provider.send({ to: phone.startsWith("+") ? phone : `+91${phone}`, message, channel: "WHATSAPP" });
      await prisma.messageLog.create({
        data: {
          memberId: member.id, templateId: template?.id, message,
          channel: MessageChannel.WHATSAPP,
          status: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
          sentAt: result.success ? new Date() : undefined,
          failureReason: result.error,
          trigger: AutomationTrigger.ALREADY_EXPIRED, isManual: false,
        },
      });
      if (result.success) messagesQueued++;
    } catch (e: any) {
      errors.push(`Member ${member.memberId}: ${e.message}`);
    }
  }

  return { processed, messagesQueued, errors };
}
