"use client";

import { useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
  Receipt, Copy, Check, Printer, ExternalLink, QrCode,
  MessageCircle, Users, RotateCcw, CreditCard, AlertTriangle,
  IndianRupee, CalendarX, UserX, ClipboardList, FileUp, ArrowRight,
} from "lucide-react";
import { formatCurrency, cn, COMPANY_COLORS } from "@/lib/utils";
import type { Company } from "@prisma/client";

type ExpiringSoon = {
  id: string; memberId: string; fullName: string;
  phone: string; expiryDate: string | null; primaryCompany: Company;
};

type Props = {
  formUrl: string;
  userName: string;
  userRole: string;
  todayPaymentCount: number;
  todayPaymentTotal: number;
  monthPaymentTotal: number;
  monthPaymentCount: number;
  expiringThisWeek: number;
  expiringToday: number;
  activeMembers: number;
  expiredMembers: number;
  expiringSoonList: ExpiringSoon[];
};

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return diff;
}

export function StaffToolsClient({
  formUrl, userName, userRole,
  todayPaymentCount, todayPaymentTotal,
  monthPaymentTotal, monthPaymentCount,
  expiringThisWeek, expiringToday,
  activeMembers, expiredMembers, expiringSoonList,
}: Props) {
  const [copied, setCopied] = useState(false);
  const hasForm = !!formUrl;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  function copyLink() {
    if (!formUrl) return;
    navigator.clipboard.writeText(formUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Hi! Please fill in this quick registration form for Yos Fitness Studio:\n${formUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  const now = new Date();
  const monthName = now.toLocaleString("en-IN", { month: "long" });

  const statCards = [
    {
      label: "Today's Collections",
      value: formatCurrency(todayPaymentTotal),
      sub: `${todayPaymentCount} receipt${todayPaymentCount !== 1 ? "s" : ""}`,
      icon: IndianRupee,
      href: "/payments?dateFilter=today",
      strip: "bg-orange-500",
      hoverStrip: "group-hover:bg-orange-400",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      valueColor: "group-hover:text-orange-600",
    },
    {
      label: `${monthName}'s Revenue`,
      value: formatCurrency(monthPaymentTotal),
      sub: `${monthPaymentCount} receipt${monthPaymentCount !== 1 ? "s" : ""} this month`,
      icon: IndianRupee,
      href: "/payments?dateFilter=month",
      strip: "bg-green-500",
      hoverStrip: "group-hover:bg-green-400",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      valueColor: "group-hover:text-green-600",
    },
    {
      label: "Active Members",
      value: activeMembers.toString(),
      sub: "currently active",
      icon: Users,
      href: "/members?status=ACTIVE",
      strip: "bg-blue-500",
      hoverStrip: "group-hover:bg-blue-400",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      valueColor: "group-hover:text-blue-600",
    },
    {
      label: "Expiring This Week",
      value: expiringThisWeek.toString(),
      sub: expiringToday > 0 ? `${expiringToday} expire today` : "in next 7 days",
      icon: CalendarX,
      href: "/renewals",
      strip: expiringToday > 0 ? "bg-red-500" : "bg-amber-500",
      hoverStrip: expiringToday > 0 ? "group-hover:bg-red-400" : "group-hover:bg-amber-400",
      iconBg: expiringToday > 0 ? "bg-red-50" : "bg-amber-50",
      iconColor: expiringToday > 0 ? "text-red-600" : "text-amber-600",
      valueColor: expiringToday > 0 ? "group-hover:text-red-600" : "group-hover:text-amber-600",
    },
    {
      label: "Lapsed Members",
      value: expiredMembers.toString(),
      sub: expiredMembers > 0 ? "expired in last 90 days" : "all up to date",
      icon: UserX,
      href: "/members?status=EXPIRED",
      strip: expiredMembers > 0 ? "bg-red-400" : "bg-gray-300",
      hoverStrip: expiredMembers > 0 ? "group-hover:bg-red-300" : "group-hover:bg-gray-200",
      iconBg: expiredMembers > 0 ? "bg-red-50" : "bg-gray-50",
      iconColor: expiredMembers > 0 ? "text-red-500" : "text-gray-400",
      valueColor: expiredMembers > 0 ? "group-hover:text-red-500" : "group-hover:text-gray-500",
    },
  ];

  const quickActions = [
    { label: "New Receipt", desc: "Record a member payment", href: "/payments/new", icon: Receipt, accent: "border-orange-200 hover:border-orange-400", iconBg: "bg-orange-50", iconColor: "text-orange-500", adminOnly: false },
    { label: "Members", desc: "View & search all members", href: "/members", icon: Users, accent: "border-gray-200 hover:border-gray-400", iconBg: "bg-gray-50", iconColor: "text-gray-500", adminOnly: false },
    { label: "Renewals", desc: "Follow up expiring members", href: "/renewals", icon: RotateCcw, accent: "border-amber-200 hover:border-amber-400", iconBg: "bg-amber-50", iconColor: "text-amber-500", adminOnly: false },
    { label: "Payments", desc: "View all transactions", href: "/payments", icon: CreditCard, accent: "border-blue-200 hover:border-blue-400", iconBg: "bg-blue-50", iconColor: "text-blue-500", adminOnly: false },
    { label: "Attendance", desc: "Employee attendance log", href: "/employee-attendance", icon: ClipboardList, accent: "border-violet-200 hover:border-violet-400", iconBg: "bg-violet-50", iconColor: "text-violet-500", adminOnly: false },
    { label: "Import Data", desc: "Bulk import from Excel", href: "/admin/import", icon: FileUp, accent: "border-green-200 hover:border-green-400", iconBg: "bg-green-50", iconColor: "text-green-600", adminOnly: true },
  ].filter((a) => !a.adminOnly || userRole === "ADMIN");

  return (
    <div className="space-y-6">

      {/* Greeting */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-200 flex items-center justify-between">
        <div>
          <p className="text-orange-100 text-sm font-medium">{greeting},</p>
          <h2 className="text-xl font-extrabold mt-0.5">{userName.toUpperCase()} 👋</h2>
          <p className="text-orange-100 text-xs mt-1">
            {userRole.replace(/_/g, " ")} · YOS FITNESS STUDIO
          </p>
        </div>
        <div className="text-5xl opacity-20 select-none">🏋️</div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 p-5 relative overflow-hidden transition-all duration-200 cursor-pointer"
          >
            {/* Top colour strip — thickens on hover */}
            <div className={cn("absolute inset-x-0 top-0 h-[3px] transition-all duration-200 group-hover:h-[4px]", s.strip)} />

            <div className="flex items-start justify-between mt-1">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{s.label}</p>
                <p className={cn("text-2xl font-extrabold text-gray-900 mt-1.5 transition-colors duration-200", s.valueColor)}>
                  {s.value}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{s.sub}</p>
              </div>
              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                <div className={cn("rounded-xl p-2.5 transition-colors duration-200", s.iconBg)}>
                  <s.icon className={cn("h-4 w-4", s.iconColor)} />
                </div>
                <ArrowRight className="h-3 w-3 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all duration-200" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left col */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map((a) => (
                <Link key={a.href} href={a.href}
                  className={cn("flex items-center gap-3 bg-white border-2 rounded-2xl p-4 transition-all group shadow-sm", a.accent)}>
                  <div className={cn("rounded-xl p-2.5 flex-shrink-0 transition-colors", a.iconBg)}>
                    <a.icon className={cn("h-4 w-4", a.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-tight">{a.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{a.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Registration Form */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Member Registration Form</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {!hasForm ? (
                <div className="flex items-center gap-4 py-2">
                  <div className="bg-gray-100 rounded-xl p-3 flex-shrink-0">
                    <QrCode className="h-6 w-6 text-gray-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600 text-sm">Form URL not configured</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Add <code className="bg-gray-100 px-1.5 py-0.5 rounded text-orange-600 text-[11px]">NEXT_PUBLIC_REGISTRATION_FORM_URL</code> in Vercel
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-5 items-center">
                  {/* QR */}
                  <div className="flex-shrink-0 bg-white p-2.5 rounded-xl border-2 border-gray-100">
                    <QRCode value={formUrl} size={100} />
                  </div>
                  {/* Actions */}
                  <div className="flex-1 space-y-2.5">
                    <p className="text-sm font-semibold text-gray-800">Share with new member</p>
                    <div className="flex flex-col gap-2">
                      <button onClick={shareWhatsApp}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-white transition-colors"
                        style={{ background: "#25D366" }}>
                        <MessageCircle className="h-3.5 w-3.5" />
                        Send via WhatsApp
                      </button>
                      <div className="flex gap-2">
                        <button onClick={copyLink}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 transition-all">
                          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                        <a href={formUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 transition-all">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </a>
                        <Link href="/qr" target="_blank"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-gray-700 text-white transition-colors">
                          <Printer className="h-3.5 w-3.5" />
                          Print
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right col — Expiring soon */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Expiring This Week</p>
            <Link href="/renewals" className="text-xs text-orange-500 hover:text-orange-600 font-semibold">
              View all →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {expiringSoonList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
                <CalendarX className="h-10 w-10" />
                <p className="text-sm text-gray-400 font-medium">No members expiring this week</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {expiringSoonList.map((m) => {
                  const days = daysUntil(m.expiryDate);
                  const isToday = days === 0;
                  const isOverdue = days !== null && days < 0;
                  return (
                    <div key={m.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                      <div className="min-w-0 flex-1">
                        <Link href={`/members/${m.id}`}
                          className="font-semibold text-gray-900 text-sm hover:text-orange-600 transition-colors">
                          {m.fullName}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400">{m.memberId}</p>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            COMPANY_COLORS[m.primaryCompany])}>
                            {m.primaryCompany === "YOS_FITNESS" ? "YF" : "YFS"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        {isToday ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                            <AlertTriangle className="h-3 w-3" /> Today
                          </span>
                        ) : isOverdue ? (
                          <span className="text-xs font-bold text-red-400">Expired</span>
                        ) : (
                          <span className={cn("text-xs font-bold px-2 py-1 rounded-lg",
                            days !== null && days <= 2 ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50")}>
                            {days}d left
                          </span>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">{m.phone}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
