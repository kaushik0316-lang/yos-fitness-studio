import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name:         z.string().min(1).optional(),
  durationDays: z.number().int().positive().optional(),
  price:        z.number().positive().optional(),
  company:      z.enum(["YOS_FITNESS", "YOS_FITNESS_STUDIO"]).nullable().optional(),
  notes:        z.string().nullable().optional(),
  isActive:     z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data = patchSchema.parse(body);

  const pkg = await prisma.package.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(pkg);
}
