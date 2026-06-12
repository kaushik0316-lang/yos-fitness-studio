import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // All members with placeholder phone
    const placeholderPhone = await prisma.member.findMany({
      where: { phone: "0000000000" },
      select: { id: true, memberId: true, fullName: true, phone: true, status: true, createdAt: true },
      orderBy: { fullName: "asc" },
    });

    // Find names that appear more than once
    const allMembers = await prisma.member.findMany({
      select: { id: true, memberId: true, fullName: true, phone: true, status: true, createdAt: true },
    });

    const nameMap = new Map<string, typeof allMembers>();
    for (const m of allMembers) {
      const key = m.fullName.trim().toLowerCase();
      if (!nameMap.has(key)) nameMap.set(key, []);
      nameMap.get(key)!.push(m);
    }

    const duplicateNames = Array.from(nameMap.entries())
      .filter(([, members]) => members.length > 1)
      .map(([name, members]) => ({ name, members }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      placeholderPhoneCount: placeholderPhone.length,
      placeholderPhone,
      duplicateNameGroups: duplicateNames.length,
      duplicateNames,
    });
  } catch (e: any) {
    console.error("[find-duplicates]", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// DELETE: remove specific member IDs
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ids } = await req.json() as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0)
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });

    // Safety: only allow deleting members with 0000000000 phone or IMP- prefix memberId
    const toDelete = await prisma.member.findMany({
      where: { id: { in: ids } },
      select: { id: true, memberId: true, fullName: true, phone: true, _count: { select: { payments: true, attendances: true } } },
    });

    const unsafe = toDelete.filter(
      (m) => m.phone !== "0000000000" && !m.memberId.startsWith("IMP-")
    );
    if (unsafe.length > 0) {
      return NextResponse.json({
        error: "Refusing to delete — these members have real phone numbers and non-IMP IDs",
        unsafe: unsafe.map((m) => ({ memberId: m.memberId, fullName: m.fullName })),
      }, { status: 400 });
    }

    // Also refuse if any have payments or attendance
    const withData = toDelete.filter(
      (m) => m._count.payments > 0 || m._count.attendances > 0
    );
    if (withData.length > 0) {
      return NextResponse.json({
        error: "Refusing to delete — these members have payments or attendance records",
        withData: withData.map((m) => ({ memberId: m.memberId, fullName: m.fullName, payments: m._count.payments, attendances: m._count.attendances })),
      }, { status: 400 });
    }

    await prisma.member.deleteMany({ where: { id: { in: ids } } });

    return NextResponse.json({
      deleted: toDelete.length,
      members: toDelete.map((m) => ({ memberId: m.memberId, fullName: m.fullName })),
    });
  } catch (e: any) {
    console.error("[find-duplicates DELETE]", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
