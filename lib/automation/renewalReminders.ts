import { prisma } from "@/lib/prisma";
import { MemberStatus, AutomationTrigger, MessageChannel, MessageStatus } from "@prisma/client";
import { addDays, startOfDay, endOfDay, format } from "date-fns";
import { getActiveProvider } from "@/lib/messaging/provider";
import { interpolate, DEFAULT_TEMPLATES } from "@/lib/messaging/templates";

const RENEWAL_RULES: { daysBeforeExpiry: number; trigger: AutomationTrigger; templateName: string }[] = [
  { daysBeforeExpiry: 7, trigger: AutomationTrigger.EXPIRY_7_DAYS,  templateName: "yos_renewal_7d" },
  { daysBeforeExpiry: 3, trigger: AutomationTrigger.EXPIRY_3_DAYS,  templateName: "yos_renewal_3d" },
  { daysBeforeExpiry: 1, trigger: AutomationTrigger.EXPIRY_1_DAY,   templateName: "yos_renewal_1d" },
  { daysBeforeExpiry: 0, trigger: AutomationTrigger.EXPIRY_TODAY,   templateName: "yos_renewal_today" },
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
        const dbTemplate = await prisma.messageTemplate.findFirst({
          where: { trigger: rule.trigger, isActive: true },
        });

        const bodyTemplate = dbTemplate?.body ?? DEFAULT_TEMPLATES[rule.trigger as keyof typeof DEFAULT_TEMPLATES] ?? "";
        const firstName    = member.fullName.split(" ")[0];
        const expiryDate   = member.expiryDate ? format(member.expiryDate, "dd MMM yyyy") : "—";
        const packageName  = member.currentPackage?.name ?? "your membership";

        const message = interpolate(bodyTemplate, {
          name:           firstName,
          expiry_date:    expiryDate,
          days_to_expiry: rule.daysBeforeExpiry,
          package_name:   packageName,
          gym_name:       "Yos Fitness Studio",
        });

        const phone = member.whatsapp ?? member.phone;
        const provider = getActiveProvider();
        const result = await provider.send({
          to: phone!.startsWith("+") ? phone! : `+91${phone}`,
          message,
          channel: "WHATSAPP",
          // WhatsApp template for business-initiated outbound messages
          templateName: rule.templateName,
          templateParams: [
            { type: "text", text: firstName },
            { type: "text", text: packageName },
            { type: "text", text: expiryDate },
            { type: "text", text: String(rule.daysBeforeExpiry) },
          ],
        });

        await prisma.messageLog.create({
          data: {
            memberId:     member.id,
            templateId:   dbTemplate?.id,
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
      const dbTemplate = await prisma.messageTemplate.findFirst({
        where: { trigger: AutomationTrigger.ALREADY_EXPIRED, isActive: true },
      });
      const firstName  = member.fullName.split(" ")[0];
      const expiryDate = member.expiryDate ? format(member.expiryDate, "dd MMM yyyy") : "—";
      const message = interpolate(
        dbTemplate?.body ?? DEFAULT_TEMPLATES.ALREADY_EXPIRED,
        { name: firstName, expiry_date: expiryDate, gym_name: "Yos Fitness Studio" }
      );
      const phone = member.whatsapp ?? member.phone;
      const provider = getActiveProvider();
      const result = await provider.send({
        to: phone!.startsWith("+") ? phone! : `+91${phone}`,
        message,
        channel: "WHATSAPP",
        templateName: "yos_already_expired",
        templateParams: [
          { type: "text", text: firstName },
          { type: "text", text: expiryDate },
        ],
      });
      await prisma.messageLog.create({
        data: {
          memberId: member.id, templateId: dbTemplate?.id, message,
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
