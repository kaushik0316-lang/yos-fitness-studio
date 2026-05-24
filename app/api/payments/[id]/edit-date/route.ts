import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "FRONT_DESK"))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { date } = await req.json();
    if (!date) return NextResponse.json({ error: "Date required" }, { status: 400 });

    const newDate = new Date(date);
    if (isNaN(newDate.getTime()))
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    await prisma.payment.update({
      where: { id: params.id },
      data: { date: newDate },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
