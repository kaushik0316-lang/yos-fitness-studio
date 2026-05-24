import { prisma } from "@/lib/prisma";
import { MemberStatus, AutomationTrigger, MessageChannel, MessageStatus } from "@prisma/client";
import { subDays, format } from "date-fns";
import { getActiveProvider } from "@/lib/messaging/provider";
import { interpolate, DEFAULT_TEMPLATES } from "@/lib/messaging/templates";

const INACTIVITY_RULES: { daysAbsent: number; trigger: AutomationTrigger; templateName: string }[] = [
  { daysAbsent: 4,  trigger: AutomationTrigger.INACTIVE_4_DAYS,  templateName: "yos_inactive_4d" },
  { daysAbsent: 7,  trigger: AutomationTrigger.INACTIVE_7_DAYS,  templateName: "yos_inactive_7d" },
  { daysAbsent: 14, trigger: AutomationTrigger.INACTIVE_14_DAYS, templateName: "yos_inactive_14d" },
];

export async function runInactiveMembersCheck(): Promise<{
  processed: number;
  messagesQueued: number;
  errors: string[];
}> {
  const today = new Date();
  let processed = 0;
  let messagesQueued = 0;
  const errors: string[] = [];

  for (const rule of INACTIVITY_RULES) {
    const cutoffDate  = subDays(today, rule.daysAbsent);
    const exactCutoff = subDays(today, rule.daysAbsent + 1);

    const members = await prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        lastAttendanceDate: {
          gte: exactCutoff,
          lt:  cutoffDate,
        },
      },
      include: {
        trainer: { select: { fullName: true } },
        messageLogs: {
          where: {
            trigger: rule.trigger,
            createdAt: { gte: subDays(today, rule.daysAbsent) },
          },
          take: 1,
        },
      },
    });

    for (const member of members) {
      if (!member.whatsapp && !member.phone) continue;
      if (member.messageLogs.length > 0) continue;
      if (member.doNotDisturb) continue; // member has muted all automated messages

      processed++;

      try {
        const dbTemplate = await prisma.messageTemplate.findFirst({
          where: { trigger: rule.trigger, isActive: true },
        });

        const bodyTemplate = dbTemplate?.body ?? DEFAULT_TEMPLATES[rule.trigger as keyof typeof DEFAULT_TEMPLATES] ?? "";
        const firstName    = member.fullName.split(" ")[0];
        const expiryDate   = member.expiryDate ? format(member.expiryDate, "dd MMM yyyy") : "—";
        const trainerName  = member.trainer?.fullName ?? "your trainer";

        const message = interpolate(bodyTemplate, {
          name:          firstName,
          days_absent:   rule.daysAbsent,
          expiry_date:   expiryDate,
          package_name:  "your membership",
          trainer_name:  trainerName,
          gym_name:      "Yos Fitness Studio",
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
            { type: "text", text: String(rule.daysAbsent) },
            { type: "text", text: expiryDate },
            { type: "text", text: trainerName },
          ],
        });

        await prisma.messageLog.create({
          data: {
            memberId:  member.id,
            templateId: dbTemplate?.id,
            message,
            channel:   MessageChannel.WHATSAPP,
            status:    result.success ? MessageStatus.SENT : MessageStatus.FAILED,
            sentAt:    result.success ? new Date() : undefined,
            failureReason: result.error,
            trigger:   rule.trigger,
            isManual:  false,
          },
        });

        if (result.success) messagesQueued++;
      } catch (e: any) {
        errors.push(`Member ${member.memberId}: ${e.message}`);
      }
    }
  }

  return { processed, messagesQueued, errors };
}
