import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ImportClient } from "@/components/admin/ImportClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import Data" };

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <Header
        title="Import Data"
        subtitle="Bulk-import members and receipts from Excel files"
      />
      <div className="flex-1 p-6">
        <ImportClient />
      </div>
    </>
  );
}
