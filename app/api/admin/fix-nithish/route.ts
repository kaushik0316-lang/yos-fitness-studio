import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Company } from "@prisma/client";

// One-time admin route to diagnose and correct Nithish's wrongly-assigned payments.
// DELETE THIS FILE after correction is confirmed.
const FIX_SECRET = "yos-fix-nithish-2024-tmp";

// Nithish's real receipt numbers from physical Excel records (App#2663, DOJ 03/07/2025)
const NITHISH_REAL_RECEIPTS = new Set([
  "YOS_FITNESS_STUDIO_2296",
  "YOS_FITNESS_STUDIO_2333",
  "YOS_FITNESS_STUDIO_2370",
  "YOS_FITNESS_STUDIO_2396",
  "YOS_FITNESS_STUDIO_2435",
  "YOS_FITNESS_STUDIO_2462",
  "YOS_FITNESS_STUDIO_2575",
  "YOS_FITNESS_2073", // receipt 4373 in Fitness — but let API confirm the exact key
]);

function auth(req: NextRequest) {
  return req.headers.get("x-fix-secret") === FIX_SECRET;
}

function paymentKey(company: string, receiptNumber: number | null) {
  if (!receiptNumber) return null;
  return `${company}_${receiptNumber}`;
}

// ─── GET: return all payments linked to Nithish ─────────────────────────────
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nithish = await prisma.member.findFirst({
    where: { memberId: "YF-2663" },
    select: { id: true, fullName: true, memberId: true, phone: true, status: true, expiryDate: true },
  });

  if (!nithish) return NextResponse.json({ error: "Nithish not found" }, { status: 404 });

  const payments = await prisma.payment.findMany({
    where: { memberId: nithish.id, isVoided: false },
    select: {
      id: true,
      receiptNumber: true,
      company: true,
      amount: true,
      date: true,
      categoryLabel: true,
      paymentType: true,
    },
    orderBy: { date: "asc" },
  });

  const rows = payments.map((p) => ({
    id: p.id,
    key: paymentKey(p.company, p.receiptNumber),
    receiptNumber: p.receiptNumber,
    company: p.company,
    amount: p.amount,
    date: p.date,
    categoryLabel: p.categoryLabel,
    paymentType: p.paymentType,
  }));

  return NextResponse.json({
    member: nithish,
    totalPayments: rows.length,
    payments: rows,
  });
}

// ─── POST: apply correction mapping ─────────────────────────────────────────
// Body: { corrections: [{paymentId, name, mobile, crmMemberId?}], confirm }
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { corrections, confirm = false } = body as {
    corrections: Array<{ paymentId: string; name: string; mobile: string; crmMemberId?: string }>;
    confirm: boolean;
  };

  if (!corrections || corrections.length === 0) {
    return NextResponse.json({ error: "No corrections provided" }, { status: 400 });
  }

  const results: Array<{
    paymentId: string;
    name: string;
    matchMethod: string;
    found: boolean;
    memberId?: string;
    memberFullName?: string;
    updated?: boolean;
    error?: string;
  }> = [];

  for (const corr of corrections) {
    let member = null;
    let matchMethod = "none";

    // 1. Match by CRM memberId derived from APPL. NO (most reliable)
    if (corr.crmMemberId) {
      member = await prisma.member.findFirst({
        where: { memberId: corr.crmMemberId },
        select: { id: true, fullName: true, memberId: true },
      });
      if (member) matchMethod = "memberId";
    }

    // 2. Match by mobile (last 10 digits)
    if (!member) {
      const mobile10 = (corr.mobile || "").replace(/\D/g, "").slice(-10);
      if (mobile10.length >= 10) {
        member = await prisma.member.findFirst({
          where: { phone: { endsWith: mobile10 } },
          select: { id: true, fullName: true, memberId: true },
        });
        if (member) matchMethod = "phone";
      }
    }

    // 3. Name match: all tokens must appear in fullName
    if (!member) {
      const nameParts = corr.name.trim().toUpperCase().split(/[\s.]+/).filter((t) => t.length > 2);
      if (nameParts.length >= 2) {
        // Require ALL parts to match
        const candidates = await prisma.member.findMany({
          where: {
            AND: nameParts.map((p) => ({ fullName: { contains: p, mode: "insensitive" as const } })),
          },
          select: { id: true, fullName: true, memberId: true },
          take: 2,
        });
        if (candidates.length === 1) {
          member = candidates[0];
          matchMethod = "name-multi";
        }
      }
    }

    if (!member) {
      results.push({ paymentId: corr.paymentId, name: corr.name, matchMethod, found: false, error: "No member match" });
      continue;
    }

    if (confirm) {
      try {
        await prisma.payment.update({
          where: { id: corr.paymentId },
          data: { memberId: member.id },
        });
        results.push({ paymentId: corr.paymentId, name: corr.name, matchMethod, found: true, memberId: member.id, memberFullName: member.fullName, updated: true });
      } catch (e: any) {
        results.push({ paymentId: corr.paymentId, name: corr.name, matchMethod, found: true, memberId: member.id, memberFullName: member.fullName, error: e.message });
      }
    } else {
      results.push({ paymentId: corr.paymentId, name: corr.name, matchMethod, found: true, memberId: member.id, memberFullName: member.fullName, updated: false });
    }
  }

  const matched = results.filter((r) => r.found).length;
  const unmatched = results.filter((r) => !r.found).length;
  const updated = results.filter((r) => r.updated).length;

  return NextResponse.json({
    dryRun: !confirm,
    total: corrections.length,
    matched,
    unmatched,
    updated,
    results,
  });
}
