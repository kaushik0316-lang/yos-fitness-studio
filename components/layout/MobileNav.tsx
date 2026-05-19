"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Semi-Private", href: "#semi-private" },
  { label: "Services", href: "#services" },
  { label: "Membership", href: "#memberships" },
  { label: "Find Us", href: "#location" },
  { label: "FAQ", href: "#faq" },
];

const STAFF_LINKS = [
  { label: "Staff Dashboard", href: "/staff-dashboard", emoji: "🏠" },
  { label: "Check In", href: "/checkin", emoji: "📍" },
  { label: "Register as Staff", href: "/join", emoji: "✍️" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);

  function close() { setOpen(false); setStaffOpen(false); }

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Slide-down drawer */}
      <div
        className={`fixed left-0 right-0 top-16 z-50 md:hidden bg-white border-b border-gray-100 shadow-xl transition-all duration-200 ease-in-out ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <nav className="max-h-[80vh] overflow-y-auto divide-y divide-gray-100">

          {/* Regular nav links */}
          <div className="py-2">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={close}
                className="block px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Staff Portal section */}
          <div>
            <button
              onClick={() => setStaffOpen((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-bold text-gray-900 hover:bg-red-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">👤</span>
                Staff Portal
              </span>
              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${staffOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {staffOpen && (
              <div className="bg-red-50/60 border-t border-red-100">
                {STAFF_LINKS.map(({ label, href, emoji }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={close}
                    className="flex items-center gap-3 px-8 py-3.5 text-sm font-semibold text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span className="text-base">{emoji}</span>
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

        </nav>
      </div>
    </>
  );
}
