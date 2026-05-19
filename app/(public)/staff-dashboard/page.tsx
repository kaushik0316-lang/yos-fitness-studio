"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useState } from "react";
import { Copy, Check, MessageCircle, Printer, ExternalLink, QrCode, CalendarCheck, ClipboardList } from "lucide-react";
import { REGISTRATION_FORM_URL } from "@/lib/site-config";

export default function StaffDashboardPage() {
  const [copied, setCopied] = useState(false);
  const hasForm = !!REGISTRATION_FORM_URL;

  function copyLink() {
    if (!REGISTRATION_FORM_URL) return;
    navigator.clipboard.writeText(REGISTRATION_FORM_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Hi! Please fill in this quick registration form for Yos Fitness Studio:\n${REGISTRATION_FORM_URL}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  const quickLinks = [
    {
      label: "Mark Attendance",
      desc: "Check in or out at the gym",
      href: "/checkin",
      emoji: "📍",
      note: "Requires GPS · gym location only",
    },
    {
      label: "My Attendance",
      desc: "View your shift history",
      href: "/my-attendance",
      emoji: "📅",
      note: "Accessible from anywhere",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f" }}>

      {/* Header */}
      <div className="flex flex-col items-center pt-8 pb-4 px-4">
        <Image src="/Logo.png" alt="Yos Fitness Studio" width={160} height={40}
          className="h-10 w-auto object-contain mb-3" priority />
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Staff Dashboard</p>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-10 gap-4 w-full max-w-sm mx-auto">

        {/* Quick Links */}
        <div className="w-full rounded-2xl p-5" style={{ background: "#1a1a1a" }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Quick Links</p>
          <div className="space-y-2">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className="flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors"
                style={{ background: "#111" }}>
                <span className="text-2xl flex-shrink-0">{link.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{link.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{link.desc}</p>
                </div>
                <span className="text-gray-600 text-xs text-right flex-shrink-0 max-w-[90px] leading-tight">
                  {link.note}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Registration Form */}
        <div className="w-full rounded-2xl p-5" style={{ background: "#1a1a1a" }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Member Registration</p>
          <p className="text-white font-semibold text-sm mb-4">Share the form with a new member</p>

          {!hasForm ? (
            <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: "#111" }}>
              <QrCode className="h-8 w-8 text-gray-600 flex-shrink-0" />
              <div>
                <p className="text-gray-400 text-xs font-medium">Form not set up yet</p>
                <p className="text-gray-600 text-xs mt-0.5">Contact your admin</p>
              </div>
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-xl">
                  <QRCode value={REGISTRATION_FORM_URL} size={150} bgColor="#ffffff" fgColor="#111827" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={shareWhatsApp}
                  className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-colors"
                  style={{ background: "#1ebe5d" }}>
                  <MessageCircle className="h-4 w-4" />
                  Send via WhatsApp
                </button>

                <button onClick={copyLink}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: "#111", color: "#d1d5db" }}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>

                <a href={REGISTRATION_FORM_URL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: "#111", color: "#d1d5db" }}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Form
                </a>

                <Link href="/qr" target="_blank"
                  className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-colors"
                  style={{ background: "#222" }}>
                  <Printer className="h-3.5 w-3.5" />
                  Print QR Code
                </Link>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
