import { prisma } from "@/lib/prisma";
import { getFirstName } from "@/lib/utils/titleCase";
import { MemberStatus, AutomationTrigger, MessageChannel, MessageStatus } from "@prisma/client";
import { format } from "date-fns";
import { getActiveProvider } from "@/lib/messaging/provider";
import { interpolate, DEFAULT_TEMPLATES } from "@/lib/messaging/templates";

// ── IST date helpers ─────────────────────────────────────────────────────────
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Returns midnight UTC for today's IST calendar date */
function todayIST(): Date {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

/** Subtract N calendar days (as UTC midnight) */
function subDaysUTC(date: Date, n: number): Date {
  return new Date(date.getTime() - n * 24 * 60 * 60 * 1000);
}

/** Clean phone number — strip spaces, dashes, parentheses */
function cleanPhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}

// ── Rules ────────────────────────────────────────────────────────────────────
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
  const today = todayIST(); // midnight UTC for today's IST date
  let processed = 0;
  let messagesQueued = 0;
  const errors: string[] = [];

  for (const rule of INACTIVITY_RULES) {
    // Use UTC midnight boundaries so members stored at midnight UTC are correctly caught
    // Window: [today - (N+1) days, today - N days) — exactly N days absent
    const windowEnd   = subDaysUTC(today, rule.daysAbsent);       // midnight N days ago
    const windowStart = subDaysUTC(today, rule.daysAbsent + 1);   // midnight N+1 days ago

    const members = await prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        doNotDisturb: false,
        OR: [
          // Members who last attended exactly N days ago
          {
            lastAttendanceDate: {
              gte: windowStart,
              lt:  windowEnd,
            },
          },
          // Members who NEVER attended but joined more than N days ago
          {
            lastAttendanceDate: null,
            joinDate: { lt: windowEnd },
          },
        ],
      },
      include: {
        trainer: { select: { fullName: true } },
        messageLogs: {
          where: {
            trigger: rule.trigger,
            createdAt: { gte: windowStart }, // don't re-send within the same window
          },
          take: 1,
        },
      },
    });

    for (const member of members) {
      if (!member.whatsapp && !member.phone) continue;
      if (member.messageLogs.length > 0) continue;

      processed++;

      try {
        const dbTemplate = await prisma.messageTemplate.findFirst({
          where: { trigger: rule.trigger, isActive: true },
        });

        const bodyTemplate = dbTemplate?.body ?? DEFAULT_TEMPLATES[rule.trigger as keyof typeof DEFAULT_TEMPLATES] ?? "";
        const firstName    = getFirstName(member.fullName);
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

        const rawPhone = member.whatsapp ?? member.phone!;
        const phone = cleanPhone(rawPhone);
        const provider = getActiveProvider();
        const result = await provider.send({
          to: phone.startsWith("+") ? phone : `+91${phone}`,
          message,
          channel: "WHATSAPP",
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
            memberId:      member.id,
            templateId:    dbTemplate?.id,
            message,
            channel:       MessageChannel.WHATSAPP,
            status:        result.success ? MessageStatus.SENT : MessageStatus.FAILED,
            sentAt:        result.success ? new Date() : undefined,
            failureReason: result.error,
            trigger:       rule.trigger,
            isManual:      false,
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
