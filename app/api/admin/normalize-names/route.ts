import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { toTitleCase } from "@/lib/utils/titleCase";

// One-time: normalize all member fullNames to title case.
// GET → dry run, POST → execute. Remove after use.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.member.findMany({ select: { id: true, fullName: true } });
  const toFix = members
    .map((m) => ({ id: m.id, before: m.fullName, after: toTitleCase(m.fullName) }))
    .filter((m) => m.before !== m.after);

  return NextResponse.json({ dryRun: true, total: members.length, toFix: toFix.length, preview: toFix.slice(0, 20) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.member.findMany({ select: { id: true, fullName: true } });
  const toFix = members
    .map((m) => ({ id: m.id, after: toTitleCase(m.fullName) }))
    .filter((m, i) => m.after !== members[i].fullName);

  // Process in batches of 50 to avoid connection pool / timeout issues
  const BATCH = 50;
  for (let i = 0; i < toFix.length; i += BATCH) {
    const batch = toFix.slice(i, i + BATCH);
    await Promise.all(
      batch.map((m) => prisma.member.update({ where: { id: m.id }, data: { fullName: m.after } }))
    );
  }

  return NextResponse.json({ success: true, updated: toFix.length, note: "Remove this endpoint now." });
}
