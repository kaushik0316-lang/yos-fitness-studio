import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { getWaTemplateRows } from "@/lib/actions/waTemplates";
import { WaTemplatesClient } from "@/components/settings/WaTemplatesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Message Templates" };

export default async function WaTemplatesPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/");

  const templates = await getWaTemplateRows();

  return (
    <>
      <Header title="Message Templates" subtitle="WhatsApp messages sent to members" />
      <div className="flex-1 overflow-y-auto p-6">
        <WaTemplatesClient templates={templates as any} />
      </div>
    </>
  );
}
