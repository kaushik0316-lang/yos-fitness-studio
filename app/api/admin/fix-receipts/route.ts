import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-renumber-2681";

export async function POST(req: Request) {
  const body = await req.json();
  if (body.secret !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payments = await prisma.payment.findMany({
    where: { company: "YOS_FITNESS_STUDIO", receiptNumber: { gt: 2680 } },
    select: { id: true, receiptNumber: true },
    orderBy: { receiptNumber: "asc" },
  });

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < payments.length; i++)
      await tx.payment.update({ where: { id: payments[i].id }, data: { receiptNumber: 100000 + i } });
    for (let i = 0; i < payments.length; i++)
      await tx.payment.update({ where: { id: payments[i].id }, data: { receiptNumber: 2681 + i } });
  });

  return NextResponse.json({ ok: true, renumbered: payments.length, newMax: 2680 + payments.length });
}
