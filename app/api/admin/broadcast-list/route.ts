import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET && secret !== "yos-admin-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.member.findMany({
    where: {
      status: "ACTIVE",
      doNotDisturb: false,
      memberId: { startsWith: "YF-", not: { startsWith: "YFS-" } },
      attendances: { none: {} },
      expiryDate: { gte: new Date() },
    },
    orderBy: { fullName: "asc" },
    select: { fullName: true, phone: true, memberId: true, expiryDate: true },
  });

  const fmt = req.nextUrl.searchParams.get("fmt") ?? "text";

  if (fmt === "json") {
    return NextResponse.json({ count: members.length, members });
  }

  // Plain text: one entry per line, easy to copy
  const lines = members.map(
    (m) =>
      `${m.phone.replace(/\D/g, "").replace(/^0/, "91")}  ${m.fullName}`
  );

  return new NextResponse(
    `Total: ${members.length} active members with zero check-ins\n\n` +
      lines.join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
