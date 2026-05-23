import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ImportClient } from "@/components/admin/ImportClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import" };

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/members");

  return (
    <>
      <Header
        title="Import"
        subtitle="Bulk import members and receipts from Excel"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <ImportClient />
      </div>
    </>
  );
}
