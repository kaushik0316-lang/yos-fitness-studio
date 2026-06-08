import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Public marketing & staff-portal pages — no auth required
const PUBLIC_PAGES = new Set([
  "/",
  "/gym-in-mylapore",
  "/personal-training-mylapore",
  "/weight-loss-training-mylapore",
  "/semi-private-coaching-chennai",
  "/strength-training-mylapore",
  "/checkin",
  "/checkin/poster",
  "/staff-dashboard",
  "/staff-dashboard/new-receipt",
  "/register",
  "/my-attendance",
  "/join",
  "/login",
  "/qr",
  "/member-portal",
  "/member-checkin",
  "/member-checkin/poster",
  "/my-membership",
]);

// CRM routes that require a verified session (path-prefix match)
const PROTECTED_PREFIXES = [
  "/admin",
  "/attendance",
  "/dashboard",
  "/automation",
  "/employee-attendance",
  "/members",
  "/messages",
  "/payments",
  "/payroll",
  "/renewals",
  "/reports",
  "/settings",
  "/staff-tools",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Always allow public pages
  if (PUBLIC_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  // Always let API routes handle their own auth
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // CRM routes — require a valid, verified session
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isProtected) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Anything else → homepage
  return NextResponse.redirect(new URL("/", req.url));
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.xml$|.*\\.txt$).*)",
  ],
};
