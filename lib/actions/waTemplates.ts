"use server";

import { prisma } from "@/lib/prisma";

export type WaTemplateRow = {
  id: string;
  key: string;
  label: string;
  category: string;
  body: string;
  updatedAt: Date;
};

// Default bodies — mirrors renewalTemplate.ts and ReportsClient upsell message.
// Uses {{name}} and {{date}} as placeholders.
const DEFAULTS: Omit<WaTemplateRow, "id" | "updatedAt">[] = [
  // ── Renewal: Personal Training ──────────────────────────────────────────────
  { key: "renewal_pt_expired",  label: "PT — Already Expired",  category: "renewal",
    body: "Hi {{name}}! Your Personal Training package expired on *{{date}}*. We'd love to have you back — do renew at the earliest!\n– Team Yos" },
  { key: "renewal_pt_today",    label: "PT — Expires Today",    category: "renewal",
    body: "Hi {{name}}! Your Personal Training package expires *today*. Do renew at the earliest — we enjoy having you here!\n– Team Yos" },
  { key: "renewal_pt_upcoming", label: "PT — Expiring Soon",    category: "renewal",
    body: "Hi {{name}}! Just a quick note that your Personal Training package is expiring on *{{date}}*. Do renew at the earliest — we enjoy having you here!\n– Team Yos" },

  // ── Renewal: Semi-Private Coaching ──────────────────────────────────────────
  { key: "renewal_semi_expired",  label: "Semi-Private — Already Expired",  category: "renewal",
    body: "Hi {{name}}! Your Semi-Private Coaching membership expired on *{{date}}*. We'd love to have you back — do renew at the earliest!\n– Team Yos" },
  { key: "renewal_semi_today",    label: "Semi-Private — Expires Today",    category: "renewal",
    body: "Hi {{name}}! Your Semi-Private Coaching membership expires *today*. Do renew at the earliest — we enjoy having you here!\n– Team Yos" },
  { key: "renewal_semi_upcoming", label: "Semi-Private — Expiring Soon",    category: "renewal",
    body: "Hi {{name}}! Just a heads-up that your Semi-Private Coaching membership is expiring on *{{date}}*. Do renew at the earliest — we enjoy having you here!\n– Team Yos" },

  // ── Renewal: HIIT Classes ────────────────────────────────────────────────────
  { key: "renewal_hiit_expired",  label: "HIIT — Already Expired",  category: "renewal",
    body: "Hi {{name}}! Your HIIT Classes membership expired on *{{date}}*. We'd love to have you back — do renew at the earliest!\n– Team Yos" },
  { key: "renewal_hiit_today",    label: "HIIT — Expires Today",    category: "renewal",
    body: "Hi {{name}}! Your HIIT Classes membership expires *today*. Do renew at the earliest — we enjoy having you here!\n– Team Yos" },
  { key: "renewal_hiit_upcoming", label: "HIIT — Expiring Soon",    category: "renewal",
    body: "Hi {{name}}! Just a heads-up that your HIIT Classes membership is expiring on *{{date}}*. Do renew at the earliest — we enjoy having you here!\n– Team Yos" },

  // ── Renewal: General ────────────────────────────────────────────────────────
  { key: "renewal_general_expired",  label: "General — Already Expired",  category: "renewal",
    body: "Hi {{name}}!\n\nYour Yos Fitness Studio membership expired on *{{date}}*. We'd love to have you back whenever you're ready!\n\nSee you soon!\n– Team Yos" },
  { key: "renewal_general_upcoming", label: "General — Expiring Soon",    category: "renewal",
    body: "Hi {{name}}!\n\nJust a heads-up — your Yos Fitness Studio membership is expiring on *{{date}}*. No rush, but we'd love to keep seeing you here!\n\nSee you at the studio!\n– Team Yos" },

  // ── Win-back ─────────────────────────────────────────────────────────────────
  { key: "winback_pt",      label: "Win-back — PT",           category: "winback",
    body: "Hi {{name}}! We miss you at Yos!\n\nIt's been a while since your Personal Training sessions. Your trainer misses working with you — whenever you're ready, we're here!\n\nWould love to have you back!\n– Team Yos" },
  { key: "winback_semi",    label: "Win-back — Semi-Private", category: "winback",
    body: "Hi {{name}}! We miss you at Yos!\n\nIt's been a while since your Semi-Private Coaching sessions. The group isn't the same without you — come back whenever you're ready!\n\nWould love to have you back!\n– Team Yos" },
  { key: "winback_hiit",    label: "Win-back — HIIT",         category: "winback",
    body: "Hi {{name}}! We miss you at Yos!\n\nIt's been a while since your last HIIT class. Whenever you're ready to get back at it, we're here!\n\nWould love to have you back!\n– Team Yos" },
  { key: "winback_general", label: "Win-back — General",      category: "winback",
    body: "Hi {{name}}!\n\nWe miss you at Yos! It's been a while — hope you're doing well.\n\nWhenever you're ready to get back, we're here for you!\n\nSee you soon!\n– Team Yos" },

  // ── PT Upsell ────────────────────────────────────────────────────────────────
  { key: "upsell_pt", label: "PT Upsell", category: "upsell",
    body: "Hi {{name}}! We've noticed you've been super consistent at Yos — that's amazing!\n\nWe'd love to help you take it to the next level. With Personal Training or Semi-Private Coaching, you get a structured plan built around your goals, proper form guidance to avoid injuries, and a trainer who tracks your progress every session.\n\nMost members see better results in 4-6 weeks compared to months of solo training.\n\nInterested? Come chat with us at the studio or just reply here — we'll walk you through the options!\n\n– Team Yos" },
];

// Seed any missing templates (safe to call on every page load — upserts only missing keys)
export async function seedWaTemplates() {
  await Promise.all(
    DEFAULTS.map((t) =>
      prisma.waTemplate.upsert({
        where: { key: t.key },
        update: {},
        create: t,
      })
    )
  );
}

export async function getWaTemplates(): Promise<Record<string, string>> {
  await seedWaTemplates();
  const rows = await prisma.waTemplate.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.body]));
}

export async function getWaTemplateRows(): Promise<WaTemplateRow[]> {
  await seedWaTemplates();
  return prisma.waTemplate.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] });
}

export async function updateWaTemplate(key: string, body: string): Promise<void> {
  await prisma.waTemplate.update({ where: { key }, data: { body } });
}

export async function resetWaTemplate(key: string): Promise<void> {
  const def = DEFAULTS.find((d) => d.key === key);
  if (def) await prisma.waTemplate.update({ where: { key }, data: { body: def.body } });
}
