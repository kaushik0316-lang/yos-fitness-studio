import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAnnouncements } from "@/lib/actions/announcements";
import { AnnouncementsClient } from "@/components/announcements/AnnouncementsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const announcements = await getAnnouncements();
  return <AnnouncementsClient announcements={announcements} />;
}
