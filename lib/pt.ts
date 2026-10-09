import { prisma } from "@/lib/prisma";

// Flow: the member REQUESTS a slot (held), the trainer confirms it is free, then the member pays.
export const REQUEST_HOURS = 12;      // how long the trainer has to answer
export const PAY_WINDOW_HOURS = 3;    // how long the member has to pay after the trainer confirms
export const MIN_PAY_MINUTES = 20;    // never offer a payment window shorter than this
export const SESSION_BUFFER_MINUTES = 30; // answers and payments must land this long before the session
export const PAY_HOLD_EXTRA_MINUTES = 5;  // the slot hold outlasts the payment link by this much

export type PtWindows = Record<string, { start: string; end: string }>;
export type SlotDay = { date: string; slots: { trainerId: string; trainerName: string; time: string }[] };

// The IST calendar day as a UTC-midnight date (this is how session dates are stored).
export function istToday(): Date {
  const d = new Date(Date.now() + 5.5 * 3600_000);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
export const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const parseDay = (s: string) => new Date(`${s}T00:00:00.000Z`);

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

// The real moment a slot starts (date and time are IST).
export function slotInstant(date: Date, hhmm: string): Date {
  return new Date(date.getTime() + toMin(hhmm) * 60_000 - 5.5 * 3600_000);
}
export const slotKeyOf = (trainerId: string, date: Date, time: string) => `${trainerId}|${ymd(date)}|${time}`;

export function validWindow(w: unknown): w is { start: string; end: string } {
  if (!w || typeof w !== "object") return false;
  const { start, end } = w as Record<string, unknown>;
  const ok = (v: unknown) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  return ok(start) && ok(end) && toMin(start as string) < toMin(end as string);
}

export async function getPtConfig() {
  return prisma.ptConfig.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } });
}

// When an unanswered request stops holding its slot.
export function requestDeadline(date: Date, time: string): Date {
  const byWindow = Date.now() + REQUEST_HOURS * 3600_000;
  const bySession = slotInstant(date, time).getTime() - SESSION_BUFFER_MINUTES * 60_000;
  return new Date(Math.min(byWindow, bySession));
}

// Requests nobody answered, and unpaid holds that ran out, free their slot again.
export async function releaseExpiredHolds() {
  await prisma.ptBooking.updateMany({
    where: { status: { in: ["REQUESTED", "PENDING_PAYMENT"] }, expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED", slotKey: null },
  });
}

type Cfg = { durationMins: number; leadHours: number; daysAhead: number };

// Free slots for the coming days: trainers' PT windows, minus held/booked slots,
// holidays, and anything starting sooner than the lead time.
export async function computeSlots(cfg: Cfg): Promise<SlotDay[]> {
  await releaseExpiredHolds();
  const trainers = await prisma.employee.findMany({
    where: { isActive: true, role: "TRAINER", ptEnabled: true },
    select: { id: true, fullName: true, ptWindows: true },
  });
  if (trainers.length === 0) return [];

  const today = istToday();
  const last = new Date(today.getTime() + cfg.daysAhead * 86_400_000);
  const [held, holidays] = await Promise.all([
    prisma.ptBooking.findMany({ where: { slotKey: { not: null }, date: { gte: today, lte: last } }, select: { slotKey: true } }),
    prisma.gymHoliday.findMany({ where: { date: { gte: today, lte: last } }, select: { date: true } }),
  ]);
  const heldSet = new Set(held.map((h) => h.slotKey as string));
  const holidaySet = new Set(holidays.map((h) => ymd(h.date)));
  const earliest = Date.now() + cfg.leadHours * 3600_000;

  const days: SlotDay[] = [];
  for (let i = 0; i <= cfg.daysAhead; i++) {
    const date = new Date(today.getTime() + i * 86_400_000);
    if (holidaySet.has(ymd(date))) continue;
    const weekday = String(date.getUTCDay());
    const slots: SlotDay["slots"] = [];
    for (const t of trainers) {
      const w = (t.ptWindows as PtWindows | null)?.[weekday];
      if (!validWindow(w)) continue;
      for (let s = toMin(w.start); s + cfg.durationMins <= toMin(w.end); s += cfg.durationMins) {
        const time = fromMin(s);
        if (slotInstant(date, time).getTime() < earliest) continue;
        if (heldSet.has(slotKeyOf(t.id, date, time))) continue;
        slots.push({ trainerId: t.id, trainerName: t.fullName, time });
      }
    }
    if (slots.length) days.push({ date: ymd(date), slots: slots.sort((a, b) => a.time.localeCompare(b.time) || a.trainerName.localeCompare(b.trainerName)) });
  }
  return days;
}
