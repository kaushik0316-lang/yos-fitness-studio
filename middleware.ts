import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that are part of the public marketing website
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

  // Redirect any route that is not a public marketing page back to the homepage
  if (!PUBLIC_PAGES.has(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except Next.js internals and static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.xml$|.*\\.txt$).*)",
  ],
};
