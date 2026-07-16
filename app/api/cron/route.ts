import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runInactiveMembersCheck } from "@/lib/automation/inactiveMembers";
import { runRenewalReminders } from "@/lib/automation/renewalReminders";
import { MemberStatus } from "@prisma/client";

async function expireOverdueMembers() {
  const now = new Date();
  const result = await prisma.member.updateMany({
    where: {
      status: MemberStatus.ACTIVE,
      expiryDate: { lt: now },
    },
    data: { status: MemberStatus.EXPIRED },
  });
  return { expired: result.count };
}

// Call this endpoint daily via a cron job (Vercel Cron, GitHub Actions, etc.)
// Header: x-cron-secret: <your CRON_SECRET>
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

  // 0. Expire overdue members first — must run before inactive check & reminders
  try {
    results.expireOverdue = await expireOverdueMembers();
  } catch (e: any) {
    results.expireOverdue = { error: e.message };
  }

  // 1. Inactive member check
  try {
    const r = await runInactiveMembersCheck();
    results.inactiveCheck = r;
    await prisma.automationLog.create({
      data: {
        type: "INACTIVE_CHECK",
        status: r.errors.length > 0 ? "PARTIAL" : "SUCCESS",
        membersProcessed: r.processed,
        messagesSent: r.messagesQueued,
        errorMessage: r.errors.length > 0 ? r.errors.join("; ") : undefined,
      },
    });
  } catch (e: any) {
    results.inactiveCheck = { error: e.message };
    await prisma.automationLog.create({
      data: { type: "INACTIVE_CHECK", status: "FAILED", errorMessage: e.message },
    });
  }

  // 2. Renewal reminders
  try {
    const r = await runRenewalReminders();
    results.renewalReminders = r;
    await prisma.automationLog.create({
      data: {
        type: "RENEWAL_REMINDER",
        status: r.errors.length > 0 ? "PARTIAL" : "SUCCESS",
        membersProcessed: r.processed,
        messagesSent: r.messagesQueued,
        errorMessage: r.errors.length > 0 ? r.errors.join("; ") : undefined,
      },
    });
  } catch (e: any) {
    results.renewalReminders = { error: e.message };
    await prisma.automationLog.create({
      data: { type: "RENEWAL_REMINDER", status: "FAILED", errorMessage: e.message },
    });
  }

  return NextResponse.json({ success: true, results, timestamp: new Date().toISOString() });
}

// GET — called by Vercel cron scheduler daily at 03:30 UTC (09:00 IST)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

  // 0. Expire overdue members first
  try {
    results.expireOverdue = await expireOverdueMembers();
  } catch (e: any) {
    results.expireOverdue = { error: e.message };
  }

  try {
    const r = await runInactiveMembersCheck();
    results.inactiveCheck = r;
    await prisma.automationLog.create({
      data: {
        type: "INACTIVE_CHECK",
        status: r.errors.length > 0 ? "PARTIAL" : "SUCCESS",
        membersProcessed: r.processed,
        messagesSent: r.messagesQueued,
        errorMessage: r.errors.length > 0 ? r.errors.join("; ") : undefined,
      },
    });
  } catch (e: any) {
    results.inactiveCheck = { error: e.message };
    await prisma.automationLog.create({
      data: { type: "INACTIVE_CHECK", status: "FAILED", errorMessage: e.message },
    });
  }

  try {
    const r = await runRenewalReminders();
    results.renewalReminders = r;
    await prisma.automationLog.create({
      data: {
        type: "RENEWAL_REMINDER",
        status: r.errors.length > 0 ? "PARTIAL" : "SUCCESS",
        membersProcessed: r.processed,
        messagesSent: r.messagesQueued,
        errorMessage: r.errors.length > 0 ? r.errors.join("; ") : undefined,
      },
    });
  } catch (e: any) {
    results.renewalReminders = { error: e.message };
    await prisma.automationLog.create({
      data: { type: "RENEWAL_REMINDER", status: "FAILED", errorMessage: e.message },
    });
  }

  return NextResponse.json({ success: true, results, timestamp: new Date().toISOString() });
}
