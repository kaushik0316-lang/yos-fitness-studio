// The marketing homepage lives in this route group.
// All other routes in (dashboard) are disabled — the middleware redirects them to /.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
