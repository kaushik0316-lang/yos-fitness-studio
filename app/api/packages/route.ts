import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const packageSchema = z.object({
  name: z.string().min(1),
  durationDays: z.number().int().positive(),
  price: z.number().positive(),
  company: z.enum(["YOS_FITNESS", "YOS_FITNESS_STUDIO"]).nullable().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data = packageSchema.parse(body);

  const pkg = await prisma.package.create({
    data: {
      name: data.name,
      durationDays: data.durationDays,
      price: data.price,
      company: data.company ?? null,
      notes: data.notes,
      isActive: true,
    },
  });

  return NextResponse.json(pkg, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // ?all=true returns inactive packages too (used by Settings)
  const includeInactive = searchParams.get("all") === "true";
  const packages = await prisma.package.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ company: "asc" }, { durationDays: "asc" }],
  });
  return NextResponse.json(packages);
}
