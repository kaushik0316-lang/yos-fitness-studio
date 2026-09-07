import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";

function isAddOnPkg(name: string | null | undefined): boolean {
  if (!name) return false;
  return /pt|personal\s*train|semi[\s-]?private|hiit/i.test(name);
}

async function expireOverdueMembers() {
  const now = new Date();

  // Find ACTIVE members whose top-level expiryDate has passed
  const candidates = await prisma.member.findMany({
    where: { status: MemberStatus.ACTIVE, expiryDate: { lt: now } },
    select: {
      id: true,
      memberships: {
        where: { expiryDate: { gte: now } },
        select: { expiryDate: true, package: { select: { name: true } } },
        orderBy: { expiryDate: "desc" },
      },
      // Also fetch latest non-voided payment with a future expiryDate (fallback for
      // receipts created via category mode which don't create membership rows)
      payments: {
        where: { isVoided: false, expiryDate: { gte: now } },
        select: { expiryDate: true, categoryLabel: true, package: { select: { name: true } } },
        orderBy: { expiryDate: "desc" },
        take: 1,
      },
    },
  });

  const toExpire: string[] = [];
  const toRestore: { id: string; expiryDate: Date }[] = [];

  for (const m of candidates) {
    // 1. Prefer active membership record (explicit, package-based)
    const activeGeneral = m.memberships.find((ms) => !isAddOnPkg(ms.package?.name));
    if (activeGeneral?.expiryDate) {
      toRestore.push({ id: m.id, expiryDate: activeGeneral.expiryDate });
      continue;
    }

    // 2. Fallback: latest non-voided payment with future expiryDate and a general (non-add-on) category
    //    Handles category-based receipts (createReceipt / renewMembership without packageId)
    //    which create a payment row but no membership row.
    const latestPayment = m.payments[0];
    const paymentPkgName = latestPayment?.categoryLabel ?? latestPayment?.package?.name;
    if (latestPayment?.expiryDate && !isAddOnPkg(paymentPkgName)) {
      toRestore.push({ id: m.id, expiryDate: latestPayment.expiryDate });
      continue;
    }

    toExpire.push(m.id);
  }

  // Sync expiryDate for members that have a valid future membership/payment
  let synced = 0;
  for (const { id, expiryDate } of toRestore) {
    await prisma.member.update({
      where: { id },
      data: { expiryDate, renewalDueDate: expiryDate, status: MemberStatus.ACTIVE },
    });
    synced++;
  }

  let expired = 0;
  if (toExpire.length > 0) {
    const result = await prisma.member.updateMany({
      where: { id: { in: toExpire } },
      data: { status: MemberStatus.EXPIRED },
    });
    expired = result.count;
  }

  return { expired, synced };
}

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const manual = req.headers.get("x-cron-secret");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return manual === cronSecret || bearer === cronSecret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

  try {
    results.expireOverdue = await expireOverdueMembers();
  } catch (e: any) {
    results.expireOverdue = { error: e.message };
  }

  return NextResponse.json({ success: true, results, timestamp: new Date().toISOString() });
}

// GET — called by Vercel cron scheduler daily at 03:30 UTC (09:00 IST)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

  try {
    results.expireOverdue = await expireOverdueMembers();
  } catch (e: any) {
    results.expireOverdue = { error: e.message };
  }

  return NextResponse.json({ success: true, results, timestamp: new Date().toISOString() });
}
