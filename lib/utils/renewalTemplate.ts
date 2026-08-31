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

export function buildRenewalMessage(
  fullName: string,
  expiryDate: Date | string | null,
  pkgName: string | null | undefined,
  isExpired: boolean,
  isWinBack = false,
): string {
  const name = toTitleCase(fullName);
  const expStr = fmtDate(expiryDate);
  const type = detectPkgType(pkgName);
  const expiresTODAY = !isExpired && isExpiringToday(expiryDate);

  // Win-back: lapsed 31–90 days — warmer, re-engagement focused
  if (isWinBack) {
    if (type === "pt") {
      return `Hi ${name}! We miss you at Yos!\n\nIt's been a while since your Personal Training sessions. Your trainer misses working with you — come back and pick up where you left off!\n\nDo drop in at the earliest. We'd love to have you back!\n– Team Yos`;
    }
    if (type === "semi") {
      return `Hi ${name}! We miss you at Yos!\n\nIt's been a while since your Semi-Private Coaching sessions. The group isn't the same without you — come back and join us!\n\nDo drop in at the earliest. We'd love to have you back!\n– Team Yos`;
    }
    if (type === "hiit") {
      return `Hi ${name}! We miss you at Yos!\n\nIt's been a while since your last HIIT class. Come back and get those endorphins going again!\n\nDo drop in at the earliest. We'd love to have you back!\n– Team Yos`;
    }
    // General win-back
    return `Hi ${name}!\n\nWe miss you at Yos Fitness Studio! It's been a while and we'd love to have you back.\n\nCome in and get back on track with your fitness journey. We're here for you!\n\nSee you soon!\n– Team Yos`;
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
    return `Hi ${name}!\n\nYour Yos Fitness Studio membership expired on *${expStr}*.\n\nWe'd love to have you back — come in to renew and keep your fitness journey going!\n\nSee you soon!\n– Team Yos`;
  }
  if (expStr) {
    return `Hi ${name}!\n\nJust a friendly reminder that your Yos Fitness Studio membership is expiring on *${expStr}*.\n\nRenew now to keep your streak going without a break!\n\nSee you at the studio!\n– Team Yos`;
  }
  return `Hi ${name}!\n\nYour Yos Fitness Studio membership is due for renewal. Come in to renew and keep training!\n\n– Team Yos`;
}
