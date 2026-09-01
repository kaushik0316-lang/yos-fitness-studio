import { toTitleCase } from "./titleCase";

function detectPkgType(pkgName: string | null | undefined): "pt" | "semi" | "hiit" | "general" {
  if (!pkgName) return "general";
  const n = pkgName.toLowerCase();
  if (n.includes("personal training") || n.includes(" pt ") || n.startsWith("pt ")) return "pt";
  if (n.includes("semi private") || n.includes("semi-private") || n.includes("semiprivate")) return "semi";
  if (n.includes("hiit") || n.includes("h.i.i.t")) return "hiit";
  return "general";
}

function fmtDate(d: Date | string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function isExpiringToday(d: Date | string | null): boolean {
  if (!d) return false;
  const exp = new Date(d);
  const today = new Date();
  return exp.getFullYear() === today.getFullYear()
    && exp.getMonth() === today.getMonth()
    && exp.getDate() === today.getDate();
}

function applyVars(template: string, name: string, date: string | null): string {
  return template.replace(/\{\{name\}\}/g, name).replace(/\{\{date\}\}/g, date ?? "");
}

export function buildOnboardingMessage(
  fullName: string,
  memberId: string,
  pkgName: string | null | undefined,
  templates?: Record<string, string>,
): string {
  const name = toTitleCase(fullName);
  const type = detectPkgType(pkgName);
  const key = `onboarding_${type}`;

  if (templates) {
    const override = templates[key] ?? templates["onboarding_general"];
    if (override) return applyVars(override, name, null).replace(/\{\{memberId\}\}/g, memberId);
  }

  const portal = `https://yosfitnessstudio.in/member-portal?setup=1`;

  if (type === "pt") {
    return `Hi ${name}! Welcome to Yos Fitness Studio!\n\nYour Member ID is *${memberId}*. Your Personal Training sessions are all set — your trainer will be in touch to schedule your first session.\n\nTrack your attendance and membership here:\n${portal}\n\nSee you soon!\n– Team Yos`;
  }
  if (type === "semi") {
    return `Hi ${name}! Welcome to Yos Fitness Studio!\n\nYour Member ID is *${memberId}*. Your Semi-Private Coaching sessions are all set — we'll keep you updated on your schedule.\n\nTrack your attendance and membership here:\n${portal}\n\nSee you soon!\n– Team Yos`;
  }
  if (type === "hiit") {
    return `Hi ${name}! Welcome to Yos Fitness Studio!\n\nYour Member ID is *${memberId}*. Your HIIT Classes membership is active — check the schedule and come in whenever you're ready!\n\nTrack your attendance and membership here:\n${portal}\n\nSee you soon!\n– Team Yos`;
  }
  return `Hi ${name}! Welcome to Yos Fitness Studio!\n\nYour Member ID is *${memberId}*.\n\nSet up your member portal to view attendance and membership details:\n${portal}\n\nSee you at the gym!\n– Team Yos`;
}

export function buildRenewalMessage(
  fullName: string,
  expiryDate: Date | string | null,
  pkgName: string | null | undefined,
  isExpired: boolean,
  isWinBack = false,
  templates?: Record<string, string>,
): string {
  const name = toTitleCase(fullName);
  const expStr = fmtDate(expiryDate);
  const type = detectPkgType(pkgName);
  const expiresTODAY = !isExpired && isExpiringToday(expiryDate);

  // Use DB template if available
  if (templates) {
    const key = isWinBack
      ? `winback_${type}`
      : isExpired
        ? `renewal_${type}_expired`
        : expiresTODAY
          ? `renewal_${type}_today`
          : `renewal_${type}_upcoming`;
    const override = templates[key] ?? (type !== "general" ? null : templates[`renewal_general_upcoming`]);
    if (override) return applyVars(override, name, expStr);
  }

  // Win-back: lapsed 31–90 days — warmer, re-engagement focused
  if (isWinBack) {
    if (type === "pt") {
      return `Hi ${name}! We miss you at Yos!\n\nIt's been a while since your Personal Training sessions. Your trainer misses working with you — whenever you're ready, we're here!\n\nWould love to have you back!\n– Team Yos`;
    }
    if (type === "semi") {
      return `Hi ${name}! We miss you at Yos!\n\nIt's been a while since your Semi-Private Coaching sessions. The group isn't the same without you — come back whenever you're ready!\n\nWould love to have you back!\n– Team Yos`;
    }
    if (type === "hiit") {
      return `Hi ${name}! We miss you at Yos!\n\nIt's been a while since your last HIIT class. Whenever you're ready to get back at it, we're here!\n\nWould love to have you back!\n– Team Yos`;
    }
    // General win-back
    return `Hi ${name}!\n\nWe miss you at Yos! It's been a while — hope you're doing well.\n\nWhenever you're ready to get back, we're here for you!\n\nSee you soon!\n– Team Yos`;
  }

  if (type === "pt") {
    if (isExpired && expStr) {
      return `Hi ${name}! Your Personal Training package expired on *${expStr}*. We'd love to have you back — do renew at the earliest!\n– Team Yos`;
    }
    if (expiresTODAY) {
      return `Hi ${name}! Your Personal Training package expires *today*. Do renew at the earliest — we enjoy having you here! 😊\n– Team Yos`;
    }
    if (expStr) {
      return `Hi ${name}! Just a quick note that your Personal Training package is expiring on *${expStr}*. Do renew at the earliest — we enjoy having you here! 😊\n– Team Yos`;
    }
    return `Hi ${name}! Your Personal Training package is due for renewal. Do renew at the earliest — we enjoy having you here! 😊\n– Team Yos`;
  }

  if (type === "semi") {
    if (isExpired && expStr) {
      return `Hi ${name}! Your Semi-Private Coaching membership expired on *${expStr}*. We'd love to have you back — do renew at the earliest!\n– Team Yos`;
    }
    if (expiresTODAY) {
      return `Hi ${name}! Your Semi-Private Coaching membership expires *today*. Do renew at the earliest — we enjoy having you here! 😊\n– Team Yos`;
    }
    if (expStr) {
      return `Hi ${name}! Just a heads-up that your Semi-Private Coaching membership is expiring on *${expStr}*. Do renew at the earliest — we enjoy having you here! 😊\n– Team Yos`;
    }
    return `Hi ${name}! Your Semi-Private Coaching membership is due for renewal. Do renew at the earliest — we enjoy having you here! 😊\n– Team Yos`;
  }

  if (type === "hiit") {
    if (isExpired && expStr) {
      return `Hi ${name}! Your HIIT Classes membership expired on *${expStr}*. We'd love to have you back — do renew at the earliest!\n– Team Yos`;
    }
    if (expiresTODAY) {
      return `Hi ${name}! Your HIIT Classes membership expires *today*. Do renew at the earliest — we enjoy having you here! 😊\n– Team Yos`;
    }
    if (expStr) {
      return `Hi ${name}! Just a heads-up that your HIIT Classes membership is expiring on *${expStr}*. Do renew at the earliest — we enjoy having you here! 😊\n– Team Yos`;
    }
    return `Hi ${name}! Your HIIT Classes membership is due for renewal. Do renew at the earliest — we enjoy having you here! 😊\n– Team Yos`;
  }

  // General gym membership
  if (isExpired && expStr) {
    return `Hi ${name}!\n\nYour Yos Fitness Studio membership expired on *${expStr}*. We'd love to have you back whenever you're ready!\n\nSee you soon!\n– Team Yos`;
  }
  if (expStr) {
    return `Hi ${name}!\n\nJust a heads-up — your Yos Fitness Studio membership is expiring on *${expStr}*. No rush, but we'd love to keep seeing you here!\n\nSee you at the studio!\n– Team Yos`;
  }
  return `Hi ${name}!\n\nYour Yos Fitness Studio membership is up for renewal soon. We'd love to keep seeing you here!\n\n– Team Yos`;
}
