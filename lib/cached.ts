import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const getCachedPackages = unstable_cache(
  () => prisma.package.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ["packages"],
  { revalidate: 60, tags: ["packages"] },
);

export const getCachedTrainers = unstable_cache(
  () =>
    prisma.employee.findMany({
      where: { isActive: true, role: { in: ["TRAINER", "MANAGER"] } },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    }),
  ["trainers"],
  { revalidate: 60, tags: ["trainers"] },
);
