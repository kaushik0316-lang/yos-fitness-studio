import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const result = await prisma.enquiry.deleteMany({ where: { phone: "9999999999" } });
  return NextResponse.json({ deleted: result.count });
}
