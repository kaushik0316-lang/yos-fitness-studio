"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getPtConfig, validWindow, type PtWindows } from "@/lib/pt";

type Result = { ok: true } | { ok: false; error: string };

async function staff(adminOnly: boolean): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Your session has expired. Please sign in again." };
  const role = session.user.role;
  if (adminOnly ? role !== "ADMIN" : role !== "ADMIN" && role !== "FRONT_DESK") {
    return { error: "You don't have permission to do this." };
  }
  return { id: session.user.id };
}

export async function savePtConfig(input: { enabled: boolean; price: number; leadHours: number; daysAhead: number }): Promise<Result> {
  const who = await staff(true);
  if ("error" in who) return { ok: false, error: who.error };
  const price = Math.round(Number(input.price));
  const leadHours = Math.round(Number(input.leadHours));
  const daysAhead = Math.round(Number(input.daysAhead));
  if (!Number.isFinite(price) || price < 1 || price > 100000) return { ok: false, error: "Enter a price between ₹1 and ₹1,00,000." };
  if (!Number.isFinite(leadHours) || leadHours < 0 || leadHours > 72) return { ok: false, error: "Booking notice must be 0 to 72 hours." };
  if (!Number.isFinite(daysAhead) || daysAhead < 1 || daysAhead > 60) return { ok: false, error: "Booking window must be 1 to 60 days." };
  await getPtConfig();
  await prisma.ptConfig.update({ where: { id: "main" }, data: { enabled: !!input.enabled, price, leadHours, daysAhead } });
  revalidatePath("/pt-slots");
  return { ok: true };
}

// windows: weekday ("0".."6", 0 = Sunday) -> { start, end }; weekdays left out are not bookable
export async function saveTrainerPt(employeeId: string, ptEnabled: boolean, windows: PtWindows): Promise<Result> {
  const who = await staff(true);
  if ("error" in who) return { ok: false, error: who.error };

  const clean: PtWindows = {};
  for (const [day, w] of Object.entries(windows ?? {})) {
    if (!/^[0-6]$/.test(day)) continue;
    if (!validWindow(w)) return { ok: false, error: "Each day needs a start time earlier than its end time." };
    clean[day] = { start: w.start, end: w.end };
  }
  if (ptEnabled && Object.keys(clean).length === 0) return { ok: false, error: "Add at least one day with hours, or switch this trainer off." };

  const trainer = await prisma.employee.findFirst({ where: { id: employeeId, role: "TRAINER" }, select: { id: true } });
  if (!trainer) return { ok: false, error: "Trainer not found." };
  await prisma.employee.update({ where: { id: employeeId }, data: { ptEnabled, ptWindows: clean } });
  revalidatePath("/pt-slots");
  return { ok: true };
}

export async function setPtBookingStatus(
  id: string,
  status: "COMPLETED" | "NO_SHOW" | "CANCELLED",
  note?: string,
): Promise<Result> {
  const who = await staff(false);
  if ("error" in who) return { ok: false, error: who.error };

  const booking = await prisma.ptBooking.findUnique({ where: { id }, select: { status: true } });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (["CANCELLED", "EXPIRED"].includes(booking.status)) return { ok: false, error: "This booking is already closed." };

  await prisma.ptBooking.update({
    where: { id },
    data: {
      status,
      staffNote: note?.trim().slice(0, 200) || null,
      // a cancelled booking frees its slot; a completed or missed one no longer needs to hold it
      slotKey: null,
    },
  });
  revalidatePath("/pt-slots");
  return { ok: true };
}
