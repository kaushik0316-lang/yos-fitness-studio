import { prisma } from "@/lib/prisma";
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

/** Add N calendar days (as UTC midnight) */
function addDaysUTC(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 24 * 60 * 60 * 1000);
}

/** End of day in UTC for a given UTC-midnight date */
function endOfDayUTC(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Clean phone number — strip spaces, dashes, parentheses */
function cleanPhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}

// ── Rules ────────────────────────────────────────────────────────────────────
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
  const today = todayIST(); // midnight UTC for today's IST date
  let processed = 0;
  let messagesQueued = 0;
  const errors: string[] = [];

  for (const rule of RENEWAL_RULES) {
    const targetDayStart = addDaysUTC(today, rule.daysBeforeExpiry);
    const targetDayEnd   = endOfDayUTC(targetDayStart);

    const members = await prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        doNotDisturb: false,
        expiryDate: { gte: targetDayStart, lte: targetDayEnd },
      },
      include: {
        currentPackage: { select: { name: true } },
        messageLogs: {
          where: {
            trigger: rule.trigger,
            createdAt: { gte: today }, // dedup: only one message per trigger per day
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
            { type: "text", text: packageName },
            { type: "text", text: expiryDate },
            { type: "text", text: String(rule.daysBeforeExpiry) },
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

  // ── Already-expired members ─────────────────────────────────────────────
  // Process in batches of 50 to avoid skipping members with the old take: 20 cap
  const sevenDaysAgo = addDaysUTC(today, -7);
  let skip = 0;
  const BATCH = 50;

  while (true) {
    const expiredBatch = await prisma.member.findMany({
      where: {
        status: MemberStatus.EXPIRED,
        doNotDisturb: false,
        messageLogs: {
          none: {
            trigger: AutomationTrigger.ALREADY_EXPIRED,
            createdAt: { gte: sevenDaysAgo }, // max once per 7 days
          },
        },
      },
      skip,
      take: BATCH,
    });

    if (expiredBatch.length === 0) break;

    for (const member of expiredBatch) {
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
        const rawPhone = member.whatsapp ?? member.phone!;
        const phone = cleanPhone(rawPhone);
        const provider = getActiveProvider();
        const result = await provider.send({
          to: phone.startsWith("+") ? phone : `+91${phone}`,
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

    if (expiredBatch.length < BATCH) break;
    skip += BATCH;
  }

  return { processed, messagesQueued, errors };
}
