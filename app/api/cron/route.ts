import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runInactiveMembersCheck } from "@/lib/automation/inactiveMembers";
import { runRenewalReminders } from "@/lib/automation/renewalReminders";

// Call this endpoint daily via a cron job (Vercel Cron, GitHub Actions, etc.)
// Header: x-cron-secret: <your CRON_SECRET>
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

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

// GET — manual trigger from UI (admin only check handled by middleware)
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recentLogs = await prisma.automationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ logs: recentLogs });
}
