import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public marketing pages — no auth required
const PUBLIC_PAGES = new Set([
  "/",
  "/gym-in-mylapore",
  "/personal-training-mylapore",
  "/weight-loss-training-mylapore",
  "/semi-private-coaching-chennai",
  "/strength-training-mylapore",
]);

// CRM routes that require authentication
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/members",
  "/attendance",
  "/employee-attendance",
  "/employees",
  "/payments",
  "/payroll",
  "/renewals",
  "/reports",
  "/messages",
  "/automation",
  "/settings",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public marketing pages
  if (PUBLIC_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  // Always allow NextAuth API routes and login page
  if (pathname.startsWith("/api/auth") || pathname === "/login") {
    return NextResponse.next();
  }

  // Always allow other API routes (packages, cron, etc.)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // For protected CRM routes: check for a session cookie
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected) {
    // NextAuth v5 session cookie name
    const sessionToken =
      req.cookies.get("authjs.session-token") ||
      req.cookies.get("__Secure-authjs.session-token");

    if (!sessionToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // Any other unknown route — redirect to homepage
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.xml$|.*\\.txt$).*)",
  ],
};
