import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "ACCOUNTANT"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");

  const members = await prisma.member.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as MemberStatus } : {}),
      memberId: { not: { startsWith: "IMP-" } },
    },
    select: {
      memberId:           true,
      fullName:           true,
      phone:              true,
      status:             true,
      expiryDate:         true,
      lastAttendanceDate: true,
      pin:                true,
      currentPackage:     { select: { name: true } },
    },
    orderBy: { memberId: "asc" },
  });

  const escape = (v: string | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;

  const header = ["Member ID","Full Name","Phone","Status","Package","Expiry Date","Last Visit","Kiosk PIN"];
  const rows = members.map((m) => [
    escape(m.memberId),
    escape(m.fullName),
    escape(m.phone),
    escape(m.status),
    escape(m.currentPackage?.name ?? ""),
    escape(m.expiryDate ? new Date(m.expiryDate).toLocaleDateString("en-IN") : ""),
    escape(m.lastAttendanceDate ? new Date(m.lastAttendanceDate).toLocaleDateString("en-IN") : "Never"),
    escape(m.pin ?? "Not set"),
  ]);

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const date = new Date().toISOString().split("T")[0];
  const label = status && status !== "ALL" ? status.toLowerCase() : "all";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="members-${label}-${date}.csv"`,
    },
  });
}
