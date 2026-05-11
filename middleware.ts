import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Only these pages are publicly accessible
const PUBLIC_PAGES = new Set([
  "/",
  "/gym-in-mylapore",
  "/personal-training-mylapore",
  "/weight-loss-training-mylapore",
  "/semi-private-coaching-chennai",
  "/strength-training-mylapore",
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public marketing pages
  if (PUBLIC_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  // Block everything else — CRM, login, auth, API, admin — redirect to homepage
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.xml$|.*\\.txt$).*)",
  ],
};
