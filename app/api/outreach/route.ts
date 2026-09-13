import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getActiveProvider } from "@/lib/messaging/provider";
import { MessageChannel, MessageStatus, MemberStatus } from "@prisma/client";
import { toTitleCase } from "@/lib/utils/titleCase";
import { format } from "date-fns";

// GET /api/outreach — active members sorted by lastAttendanceDate asc
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await prisma.member.findMany({
    where: { status: MemberStatus.ACTIVE },
    select: {
      id: true, memberId: true, fullName: true, phone: true, whatsapp: true,
      expiryDate: true, lastAttendanceDate: true, doNotDisturb: true,
      trainer: { select: { fullName: true } },
      memberships: { orderBy: { expiryDate: "desc" }, take: 1, select: { package: { select: { name: true } } } },
    },
    orderBy: { lastAttendanceDate: "asc" },
  });

  return NextResponse.json(members.map(m => ({
    id: m.id, memberId: m.memberId, fullName: m.fullName,
    phone: m.phone, whatsapp: m.whatsapp,
    expiryDate: m.expiryDate?.toISOString() ?? null,
    lastAttendanceDate: m.lastAttendanceDate?.toISOString() ?? null,
    doNotDisturb: m.doNotDisturb,
    trainerName: m.trainer?.fullName ?? null,
    packageName: m.memberships[0]?.package?.name ?? null,
  })));
}

function cleanPhone(p: string) { return p.replace(/[\s\-().]/g, ""); }

function interpolate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

// POST /api/outreach  { memberIds, message }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "FRONT_DESK"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { memberIds, message } = await req.json();
  if (!Array.isArray(memberIds) || !memberIds.length || !message?.trim())
    return NextResponse.json({ error: "memberIds and message required" }, { status: 400 });

  const members = await prisma.member.findMany({
    where: { id: { in: memberIds } },
    select: {
      id: true, fullName: true, phone: true, whatsapp: true,
      expiryDate: true, doNotDisturb: true,
      trainer: { select: { fullName: true } },
    },
  });

  const provider = getActiveProvider();
  const results: { memberId: string; name: string; status: "sent" | "failed" | "skipped"; error?: string }[] = [];

  for (const m of members) {
    const rawPhone = m.whatsapp ?? m.phone;
    if (!rawPhone || m.doNotDisturb) {
      results.push({ memberId: m.id, name: m.fullName, status: "skipped", error: m.doNotDisturb ? "DND" : "No phone" });
      continue;
    }
    const phone = cleanPhone(rawPhone);
    const personalised = interpolate(message, {
      name:        toTitleCase(m.fullName),
      expiry:      m.expiryDate ? format(m.expiryDate, "dd MMM yyyy") : "�",
      expiry_date: m.expiryDate ? format(m.expiryDate, "dd MMM yyyy") : "�",
      trainer:     m.trainer ? toTitleCase(m.trainer.fullName) : "your trainer",
    });

    const result = await provider.send({
      to: phone.startsWith("+") ? phone : `+91${phone}`,
      message: personalised,
      channel: "WHATSAPP",
    });

    await prisma.messageLog.create({
      data: {
        memberId:      m.id,
        message:       personalised,
        channel:       MessageChannel.WHATSAPP,
        status:        result.success ? MessageStatus.SENT : MessageStatus.FAILED,
        sentAt:        result.success ? new Date() : undefined,
        failureReason: result.error,
        isManual:      true,
      },
    });

    results.push({ memberId: m.id, name: m.fullName, status: result.success ? "sent" : "failed", error: result.error });
  }

  const sent   = results.filter(r => r.status === "sent").length;
  const failed = results.filter(r => r.status === "failed").length;
  return NextResponse.json({ sent, failed, results });
}
