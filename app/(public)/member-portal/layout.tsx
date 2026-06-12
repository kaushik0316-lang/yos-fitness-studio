import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#0c0c0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
