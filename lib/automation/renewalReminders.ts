import { prisma } from "@/lib/prisma";
import { toTitleCase } from "@/lib/utils/titleCase";
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
        const firstName    = toTitleCase(member.fullName);
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

  // ── Re-engagement: ACTIVE members inactive for 10+ days ────────────────────
  const tenDaysAgo = addDaysUTC(today, -10);
  const reEngageMembers = await prisma.member.findMany({
    where: {
      status: MemberStatus.ACTIVE,
      doNotDisturb: false,
      lastAttendanceDate: { lt: tenDaysAgo },
      messageLogs: {
        none: {
          trigger: AutomationTrigger.INACTIVE_14_DAYS,
          createdAt: { gte: addDaysUTC(today, -7) }, // max once per week
        },
      },
    },
    select: { id: true, memberId: true, fullName: true, phone: true, whatsapp: true, lastAttendanceDate: true },
    take: 100,
  });

  for (const member of reEngageMembers) {
    if (!member.whatsapp && !member.phone) continue;
    processed++;
    try {
      const firstName = toTitleCase(member.fullName);
      const lastSeen = member.lastAttendanceDate
        ? format(member.lastAttendanceDate, "dd MMM")
        : "a while";
      const message = `Hi ${firstName}! 👋 We haven't seen you at Yos since ${lastSeen}.\n\nEverything okay? Your membership is still active — come back anytime, we'd love to see you! 💪\n\n– Team Yos`;
      const rawPhone = member.whatsapp ?? member.phone!;
      const phone = cleanPhone(rawPhone);
      const result = await getActiveProvider().send({
        to: phone.startsWith("+") ? phone : `+91${phone}`,
        message,
        channel: "WHATSAPP",
      });
      await prisma.messageLog.create({
        data: {
          memberId: member.id, message,
          channel: MessageChannel.WHATSAPP,
          status: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
          sentAt: result.success ? new Date() : undefined,
          failureReason: result.error,
          trigger: AutomationTrigger.INACTIVE_14_DAYS,
          isManual: false,
        },
      });
      if (result.success) messagesQueued++;
    } catch (e: any) {
      errors.push(`Re-engage ${member.memberId}: ${e.message}`);
    }
  }

  // ── Membership anniversary: members whose joinDate anniversary is today ────
  const todayMonth = today.getUTCMonth() + 1;
  const todayDay   = today.getUTCDate();
  const anniversaryMembers = await prisma.member.findMany({
    where: {
      status: MemberStatus.ACTIVE,
      doNotDisturb: false,
      joinDate: { not: undefined },
    },
    select: { id: true, memberId: true, fullName: true, phone: true, whatsapp: true, joinDate: true },
  });

  for (const member of anniversaryMembers) {
    if (!member.joinDate) continue;
    const jd = member.joinDate;
    if (jd.getUTCMonth() + 1 !== todayMonth || jd.getUTCDate() !== todayDay) continue;
    const years = today.getUTCFullYear() - jd.getUTCFullYear();
    if (years < 1) continue; // skip same-year (just joined)
    if (!member.whatsapp && !member.phone) continue;

    // Dedup: one anniversary message per year (check last 10 days)
    const alreadySent = await prisma.messageLog.findFirst({
      where: { memberId: member.id, trigger: AutomationTrigger.INACTIVE_7_DAYS, createdAt: { gte: addDaysUTC(today, -10) } },
    });
    if (alreadySent) continue;

    processed++;
    try {
      const firstName = toTitleCase(member.fullName);
      const label = years === 1 ? "1 year" : `${years} years`;
      const message = `🎉 Happy ${label} at Yos, ${firstName}!\n\nThank you for being part of our community. Here's to many more sessions together! 💪\n\n– Team Yos Fitness Studio`;
      const rawPhone = member.whatsapp ?? member.phone!;
      const phone = cleanPhone(rawPhone);
      const result = await getActiveProvider().send({
        to: phone.startsWith("+") ? phone : `+91${phone}`,
        message,
        channel: "WHATSAPP",
      });
      // Reuse INACTIVE_7_DAYS trigger slot as anniversary dedup marker
      await prisma.messageLog.create({
        data: {
          memberId: member.id, message,
          channel: MessageChannel.WHATSAPP,
          status: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
          sentAt: result.success ? new Date() : undefined,
          failureReason: result.error,
          trigger: AutomationTrigger.INACTIVE_7_DAYS,
          isManual: false,
        },
      });
      if (result.success) messagesQueued++;
    } catch (e: any) {
      errors.push(`Anniversary ${member.memberId}: ${e.message}`);
    }
  }

  // ── Birthday greetings ────────────────────────────────────────────────────
  const birthdayMembers = await prisma.member.findMany({
    where: {
      status: MemberStatus.ACTIVE,
      doNotDisturb: false,
      dateOfBirth: { not: null },
    },
    select: { id: true, memberId: true, fullName: true, phone: true, whatsapp: true, dateOfBirth: true },
  });

  for (const member of birthdayMembers) {
    if (!member.dateOfBirth) continue;
    const dob = member.dateOfBirth;
    if (dob.getUTCMonth() + 1 !== todayMonth || dob.getUTCDate() !== todayDay) continue;
    if (!member.whatsapp && !member.phone) continue;

    const alreadySent = await prisma.messageLog.findFirst({
      where: { memberId: member.id, trigger: AutomationTrigger.INACTIVE_4_DAYS, createdAt: { gte: addDaysUTC(today, -1) } },
    });
    if (alreadySent) continue;

    processed++;
    try {
      const firstName = toTitleCase(member.fullName);
      const message = `🎂 Happy Birthday, ${firstName}!\n\nWishing you a wonderful day! Keep crushing those fitness goals — the whole Yos team is cheering for you! 🎉💪\n\n– Team Yos Fitness Studio`;
      const rawPhone = member.whatsapp ?? member.phone!;
      const phone = cleanPhone(rawPhone);
      const result = await getActiveProvider().send({
        to: phone.startsWith("+") ? phone : `+91${phone}`,
        message,
        channel: "WHATSAPP",
      });
      await prisma.messageLog.create({
        data: {
          memberId: member.id, message,
          channel: MessageChannel.WHATSAPP,
          status: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
          sentAt: result.success ? new Date() : undefined,
          failureReason: result.error,
          trigger: AutomationTrigger.INACTIVE_4_DAYS,
          isManual: false,
        },
      });
      if (result.success) messagesQueued++;
    } catch (e: any) {
      errors.push(`Birthday ${member.memberId}: ${e.message}`);
    }
  }

  return { processed, messagesQueued, errors };
}
