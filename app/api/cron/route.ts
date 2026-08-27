import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
