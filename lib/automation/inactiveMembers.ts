import { prisma } from "@/lib/prisma";
import { MemberStatus, AutomationTrigger, MessageChannel, MessageStatus } from "@prisma/client";
import { subDays, format } from "date-fns";
import { getActiveProvider } from "@/lib/messaging/provider";
import { interpolate, DEFAULT_TEMPLATES } from "@/lib/messaging/templates";

const INACTIVITY_RULES: { daysAbsent: number; trigger: AutomationTrigger }[] = [
  { daysAbsent: 4,  trigger: AutomationTrigger.INACTIVE_4_DAYS },
  { daysAbsent: 7,  trigger: AutomationTrigger.INACTIVE_7_DAYS },
  { daysAbsent: 14, trigger: AutomationTrigger.INACTIVE_14_DAYS },
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
    const cutoffDate = subDays(today, rule.daysAbsent);
    const exactCutoff = subDays(today, rule.daysAbsent + 1);

    // Find members absent for exactly this many days
    // (we use >= to catch all who have been absent AT LEAST this long, but
    //  skip those who already got a message for this trigger recently)
    const members = await prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        lastAttendanceDate: {
          gte: exactCutoff,  // absent for daysAbsent+1 to daysAbsent days
          lt:  cutoffDate,
        },
      },
      include: {
        trainer: { select: { fullName: true } },
        messageLogs: {
          where: {
            trigger: rule.trigger,
            createdAt: { gte: subDays(today, rule.daysAbsent) }, // don't re-send within window
          },
          take: 1,
        },
      },
    });

    for (const member of members) {
      if (!member.whatsapp && !member.phone) continue;
      if (member.messageLogs.length > 0) continue; // already sent for this trigger recently

      processed++;

      try {
        // Get template from DB, fallback to default
        const template = await prisma.messageTemplate.findFirst({
          where: { trigger: rule.trigger, isActive: true },
        });

        const bodyTemplate = template?.body ?? DEFAULT_TEMPLATES[rule.trigger as keyof typeof DEFAULT_TEMPLATES] ?? "";
        const message = interpolate(bodyTemplate, {
          name:          member.fullName.split(" ")[0],
          days_absent:   rule.daysAbsent,
          expiry_date:   member.expiryDate ? format(member.expiryDate, "dd MMM yyyy") : "—",
          package_name:  "your membership",
          trainer_name:  member.trainer?.fullName ?? "your trainer",
          gym_name:      member.primaryCompany === "YOS_FITNESS" ? "Yos Fitness" : "Yos Fitness Studio",
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
            memberId:  member.id,
            templateId: template?.id,
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
