import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { EnquiriesClient } from "@/components/enquiries/EnquiriesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage() {
  const session = await auth();

  const [enquiries, employees] = await Promise.all([
    prisma.enquiry.findMany({
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <>
      <Header title="Enquiries" subtitle="Track and follow up on leads" />
      <div className="flex-1 overflow-y-auto p-6">
        <EnquiriesClient
          enquiries={enquiries as any}
          employees={employees}
          userId={session!.user.id}
          userRole={session!.user.role}
          userName={session!.user.name ?? ""}
        />
      </div>
    </>
  );
}
