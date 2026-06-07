import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ── 1. Auth — ADMIN only ───────────────────────────────────────────────
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Member must exist ───────────────────────────────────────────────
    const member = await prisma.member.findUnique({
      where: { id: params.id },
      select: {
        id:       true,
        memberId: true,
        fullName: true,
        _count:   { select: { payments: true } },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // ── 3. Block if any payment records exist ──────────────────────────────
    if (member._count.payments > 0) {
      return NextResponse.json(
        {
          error:
            "Member has payment history. Cannot delete. Set the member to Inactive instead.",
        },
        { status: 409 }
      );
    }

    // ── 4. Hard delete — cascades attendances, memberships, messageLogs,
    //       renewalFollowUps automatically via schema onDelete: Cascade ─────
    await prisma.member.delete({ where: { id: params.id } });

    return NextResponse.json({
      ok:       true,
      memberId: member.memberId,
      fullName: member.fullName,
    });
  } catch (e: any) {
    console.error("[delete member]", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
