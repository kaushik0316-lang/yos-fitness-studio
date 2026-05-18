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
  "/checkin",
  "/my-attendance",
  "/join",
  "/login",
]);

// Public API routes — no auth required
const PUBLIC_API_PREFIXES = [
  "/api/checkin",
  "/api/my-attendance",
  "/api/join",
  "/api/auth",
];

// CRM routes that require a valid session
const PROTECTED_ROUTES = new Set([
  "/employee-attendance",
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public pages
  if (PUBLIC_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Protected CRM routes — check for session cookie
  if (PROTECTED_ROUTES.has(pathname)) {
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

  // Everything else — redirect to homepage
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.xml$|.*\\.txt$).*)",
  ],
};
