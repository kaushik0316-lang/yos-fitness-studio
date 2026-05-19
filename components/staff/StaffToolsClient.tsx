"use client";

import { useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
  Receipt, Copy, Check, Printer, ExternalLink,
  QrCode, ClipboardList, MessageCircle,
} from "lucide-react";
import { GYM_NAME, GYM_WHATSAPP } from "@/lib/site-config";

type Props = {
  formUrl: string;
  userName: string;
  userRole: string;
};

export function StaffToolsClient({ formUrl, userName, userRole }: Props) {
  const [copied, setCopied] = useState(false);
  const hasForm = !!formUrl;

  function copyLink() {
    if (!formUrl) return;
    navigator.clipboard.writeText(formUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Hi! Please fill in this quick registration form for ${GYM_NAME}:\n${formUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-200">
        <p className="text-orange-100 text-sm font-medium">{greeting},</p>
        <h2 className="text-2xl font-extrabold mt-0.5">{userName} 👋</h2>
        <p className="text-orange-100 text-sm mt-1 capitalize">
          {userRole.replace("_", " ").toLowerCase()} · Yos Fitness Studio
        </p>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/payments/new"
            className="flex items-center gap-4 bg-white border-2 border-orange-100 hover:border-orange-400 rounded-2xl p-5 transition-all group shadow-sm"
          >
            <div className="bg-orange-50 rounded-xl p-3 group-hover:bg-orange-100 transition-colors">
              <Receipt className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">New Receipt</p>
              <p className="text-xs text-gray-400 mt-0.5">Record a member payment</p>
            </div>
          </Link>

          <Link
            href="/members"
            className="flex items-center gap-4 bg-white border-2 border-gray-100 hover:border-gray-300 rounded-2xl p-5 transition-all group shadow-sm"
          >
            <div className="bg-gray-50 rounded-xl p-3 group-hover:bg-gray-100 transition-colors">
              <ClipboardList className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Members</p>
              <p className="text-xs text-gray-400 mt-0.5">View & search all members</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Registration Form */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Member Registration Form</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {!hasForm ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <div className="bg-gray-100 rounded-2xl p-4">
                <QrCode className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-600 text-sm">No form URL configured yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Ask your admin to add <code className="bg-gray-100 px-1.5 py-0.5 rounded text-orange-600 text-[11px]">NEXT_PUBLIC_REGISTRATION_FORM_URL</code> in Vercel settings
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              {/* QR Preview */}
              <div className="flex-shrink-0 bg-white p-3 rounded-xl border-2 border-gray-100">
                <QRCode value={formUrl} size={120} />
              </div>

              {/* Actions */}
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Share with new member</p>
                  <p className="text-xs text-gray-400">
                    Send the link directly or ask them to scan the QR code
                  </p>
                </div>

                {/* Link box */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                  <p className="flex-1 text-xs text-gray-500 truncate font-mono">{formUrl}</p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 transition-all"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy Link"}
                  </button>

                  <button
                    onClick={shareWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#25D366] hover:bg-[#1ebe5d] text-white transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Send via WhatsApp
                  </button>

                  <a
                    href={formUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 transition-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Form
                  </a>

                  <Link
                    href="/qr"
                    target="_blank"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-gray-700 text-white transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print QR
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
