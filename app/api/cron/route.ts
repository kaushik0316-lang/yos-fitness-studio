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
    },
  });

  const toExpire: string[] = [];
  const toRestore: { id: string; expiryDate: Date }[] = [];

  for (const m of candidates) {
    // A general (non-add-on) membership still active means the member shouldn't expire
    const activeGeneral = m.memberships.find((ms) => !isAddOnPkg(ms.package?.name));
    if (activeGeneral?.expiryDate) {
      toRestore.push({ id: m.id, expiryDate: activeGeneral.expiryDate });
    } else {
      toExpire.push(m.id);
    }
  }

  // Restore members whose expiryDate was incorrectly overridden by an add-on payment
  for (const { id, expiryDate } of toRestore) {
    await prisma.member.update({
      where: { id },
      data: { expiryDate, renewalDueDate: expiryDate },
    });
  }

  let expired = 0;
  if (toExpire.length > 0) {
    const result = await prisma.member.updateMany({
      where: { id: { in: toExpire } },
      data: { status: MemberStatus.EXPIRED },
    });
    expired = result.count;
  }

  return { expired, restored: toRestore.length };
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
