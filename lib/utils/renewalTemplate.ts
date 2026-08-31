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

export function buildRenewalMessage(
  fullName: string,
  expiryDate: Date | string | null,
  pkgName: string | null | undefined,
  isExpired: boolean,
): string {
  const name = toTitleCase(fullName);
  const expStr = fmtDate(expiryDate);
  const type = detectPkgType(pkgName);

  if (type === "pt") {
    if (isExpired && expStr) {
      return `Hi ${name}!\n\nYour *Personal Training* sessions with us expired on *${expStr}*.\n\nYour trainer misses working with you! Come back in to renew your PT package and continue making progress towards your goals.\n\nSee you soon!\n– Team Yos`;
    }
    if (expStr) {
      return `Hi ${name}!\n\nJust a heads-up — your *Personal Training* package is expiring on *${expStr}*.\n\nRenew now to keep your sessions going and stay on track with your trainer!\n\nSee you at the studio!\n– Team Yos`;
    }
    return `Hi ${name}!\n\nYour *Personal Training* package is due for renewal. Reach out to us to continue your sessions!\n\n– Team Yos`;
  }

  if (type === "semi") {
    if (isExpired && expStr) {
      return `Hi ${name}!\n\nYour *Semi-Private Coaching* membership expired on *${expStr}*.\n\nYour training group misses you! Come back to renew and keep training alongside your team.\n\nSee you soon!\n– Team Yos`;
    }
    if (expStr) {
      return `Hi ${name}!\n\nA quick reminder — your *Semi-Private Coaching* membership is expiring on *${expStr}*.\n\nRenew early to secure your spot with your group and keep the momentum going!\n\nSee you at the studio!\n– Team Yos`;
    }
    return `Hi ${name}!\n\nYour *Semi-Private Coaching* membership is due for renewal. Contact us to lock in your spot!\n\n– Team Yos`;
  }

  if (type === "hiit") {
    if (isExpired && expStr) {
      return `Hi ${name}!\n\nYour *HIIT Classes* membership expired on *${expStr}*.\n\nDon't lose your fitness momentum — renew now and get back to burning those calories with the group! 🔥\n\nSee you soon!\n– Team Yos`;
    }
    if (expStr) {
      return `Hi ${name}!\n\nHeads up — your *HIIT Classes* membership is expiring on *${expStr}*.\n\nRenew now and keep crushing those workouts without missing a beat! 🔥\n\nSee you at the studio!\n– Team Yos`;
    }
    return `Hi ${name}!\n\nYour *HIIT Classes* membership is due for renewal. Come in and keep the energy going!\n\n– Team Yos`;
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
