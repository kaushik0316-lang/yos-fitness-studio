"use client";

import { useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
  Receipt, Copy, Check, Printer, ExternalLink, QrCode,
  MessageCircle, Users, RotateCcw, CreditCard, AlertTriangle,
  IndianRupee, CalendarX, ClipboardList, FileUp, ArrowRight,
  LogOut, Clock,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import { TodayAttendanceWidget } from "@/components/dashboard/TodayAttendanceWidget";
import { CollectionsWidget } from "@/components/dashboard/CollectionsWidget";
import { InactiveMembersAlert } from "@/components/dashboard/InactiveMembersAlert";

type ExpiringSoon = {
  id: string; memberId: string; fullName: string;
  phone: string; expiryDate: string | null;
};

type InactiveMember = {
  id: string; memberId: string; fullName: string; phone: string;
  lastAttendanceDate: Date | null; expiryDate: Date | null;
  trainer: { fullName: string } | null;
};

type StaffCheckedIn = {
  shiftId: string; employeeId: string; fullName: string;
  role: string; checkInTime: string;
};

type Props = {
  formUrl: string;
  userName: string;
  userRole: string;
  todayPaymentCount: number;
  todayPaymentTotal: number;
  monthPaymentTotal: number;
  monthPaymentCount: number;
  yosFitnessMonthly: number;
  yosStudioMonthly: number;
  expiringThisWeek: number;
  expiringToday: number;
  activeMembers: number;
  expiringSoonList: ExpiringSoon[];
  attendanceTrend: { date: string; count: number }[];
  inactiveMembers: InactiveMember[];
  staffCheckedIn: StaffCheckedIn[];
};

function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

const CARD = { background: "#161616", border: "1px solid rgba(255,255,255,0.06)" } as const;
const DIVIDER = { borderTop: "1px solid rgba(255,255,255,0.05)" } as const;

export function StaffToolsClient({
  formUrl, userName, userRole,
  todayPaymentCount, todayPaymentTotal,
  monthPaymentTotal, monthPaymentCount,
  yosFitnessMonthly, yosStudioMonthly,
  expiringThisWeek, expiringToday,
  activeMembers, expiringSoonList,
  attendanceTrend, inactiveMembers, staffCheckedIn,
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
    const msg = encodeURIComponent(`Hi! Please fill in this quick registration form for Yos Fitness Studio:\n${formUrl}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  const now = new Date();
  const monthName = now.toLocaleString("en-IN", { month: "long" });

  const statCards = [
    {
      label: "Today's Collections",
      value: formatCurrency(todayPaymentTotal),
      sub: `${todayPaymentCount} receipt${todayPaymentCount !== 1 ? "s" : ""}`,
      icon: IndianRupee, href: "/payments?dateFilter=today",
      strip: "#f97316", iconBg: "rgba(249,115,22,0.12)", iconColor: "#f97316",
    },
    {
      label: `${monthName}'s Revenue`,
      value: formatCurrency(monthPaymentTotal),
      sub: `${monthPaymentCount} receipts this month`,
      icon: IndianRupee, href: "/payments?dateFilter=month",
      strip: "#10b981", iconBg: "rgba(16,185,129,0.12)", iconColor: "#10b981",
    },
    {
      label: "Active Members",
      value: activeMembers.toString(),
      sub: "paid memberships",
      icon: Users, href: "/members?status=ACTIVE",
      strip: "#3b82f6", iconBg: "rgba(59,130,246,0.12)", iconColor: "#3b82f6",
    },
    {
      label: "Expiring This Week",
      value: expiringThisWeek.toString(),
      sub: expiringToday > 0 ? `${expiringToday} expire today` : "in next 7 days",
      icon: CalendarX, href: "/renewals",
      strip: expiringToday > 0 ? "#ef4444" : "#f59e0b",
      iconBg: expiringToday > 0 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
      iconColor: expiringToday > 0 ? "#f87171" : "#fbbf24",
    },
  ];

  const quickActions = [
    { label: "New Receipt",    desc: "Record a payment",          href: "/payments/new",         icon: Receipt,     iconBg: "rgba(249,115,22,0.12)",  iconColor: "#f97316", adminOnly: false },
    { label: "Members",        desc: "View & search all members", href: "/members",               icon: Users,       iconBg: "rgba(255,255,255,0.06)", iconColor: "#9ca3af", adminOnly: false },
    { label: "Renewals",       desc: "Follow up expiring",        href: "/renewals",              icon: RotateCcw,   iconBg: "rgba(245,158,11,0.12)",  iconColor: "#fbbf24", adminOnly: false },
    { label: "Payments",       desc: "View all transactions",     href: "/payments",              icon: CreditCard,  iconBg: "rgba(59,130,246,0.12)",  iconColor: "#60a5fa", adminOnly: false },
    { label: "Emp. Attendance",desc: "Employee check-in log",     href: "/employee-attendance",   icon: ClipboardList,iconBg: "rgba(139,92,246,0.12)", iconColor: "#a78bfa", adminOnly: false },
    { label: "Import Data",    desc: "Bulk import from Excel",    href: "/admin/import",          icon: FileUp,      iconBg: "rgba(16,185,129,0.12)",  iconColor: "#34d399", adminOnly: true  },
  ].filter((a) => !a.adminOnly || userRole === "ADMIN");

  return (
    <div className="space-y-5">

      {/* ── Greeting ── */}
      <div className="rounded-2xl px-6 py-5 flex items-center justify-between relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(234,88,12,0.08) 100%)", border: "1px solid rgba(249,115,22,0.18)" }}>
        <div className="relative z-10">
          <p className="text-sm font-medium" style={{ color: "rgba(253,186,116,0.8)" }}>{greeting},</p>
          <h2 className="text-2xl font-extrabold text-white mt-0.5 tracking-tight">{userName}</h2>
          <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
            {userRole === "ADMIN" ? "Administrator" : userRole === "FRONT_DESK" ? "Front Desk" : userRole === "ACCOUNTANT" ? "Accountant" : "Trainer"} · Yos Fitness Studio
          </p>
        </div>
        <div className="text-5xl opacity-[0.08] select-none absolute right-6 top-1/2 -translate-y-1/2">🏋️</div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Link key={s.label} href={s.href}
            className="group rounded-2xl p-4 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
            style={{ ...CARD, cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)")}
          >
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl transition-all duration-200" style={{ background: s.strip }} />
            <div className="flex items-start justify-between mt-1">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] font-bold uppercase tracking-widest leading-tight" style={{ color: "#4b5563" }}>{s.label}</p>
                <p className="text-xl font-extrabold text-white mt-1.5 leading-none">{s.value}</p>
                <p className="text-[11px] mt-1 leading-tight" style={{ color: "#6b7280" }}>{s.sub}</p>
              </div>
              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                <div className="rounded-xl p-2" style={{ background: s.iconBg }}>
                  <s.icon className="h-3.5 w-3.5" style={{ color: s.iconColor }} />
                </div>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200" style={{ color: "#9ca3af" }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Main 2-col ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left col */}
        <div className="space-y-5">

          {/* Quick Actions */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#4b5563" }}>Jump To</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
              {quickActions.map((a) => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-3 rounded-xl p-3.5 transition-all duration-150"
                  style={CARD}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "#1c1c1c";
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "#161616";
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)";
                  }}
                >
                  <div className="rounded-lg p-2 flex-shrink-0" style={{ background: a.iconBg }}>
                    <a.icon className="h-3.5 w-3.5" style={{ color: a.iconColor }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-xs leading-tight truncate">{a.label}</p>
                    <p className="text-[10px] leading-tight mt-0.5 truncate" style={{ color: "#6b7280" }}>{a.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Registration Form */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#4b5563" }}>New Member Link</p>
            <div className="rounded-2xl p-5" style={CARD}>
              {!hasForm ? (
                <div className="flex items-center gap-4 py-2">
                  <div className="rounded-xl p-3 flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <QrCode className="h-6 w-6" style={{ color: "#374151" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#9ca3af" }}>Form URL not configured</p>
                    <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>
                      Add <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>NEXT_PUBLIC_REGISTRATION_FORM_URL</code> in Vercel
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-5 items-center">
                  {/* QR — needs white bg to scan */}
                  <div className="flex-shrink-0 bg-white p-2.5 rounded-xl">
                    <QRCode value={formUrl} size={96} />
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <p className="text-sm font-semibold text-white">Share with new member</p>
                    <div className="flex flex-col gap-2">
                      <button onClick={shareWhatsApp}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
                        style={{ background: "#25D366" }}>
                        <MessageCircle className="h-3.5 w-3.5" />
                        Send via WhatsApp
                      </button>
                      <div className="flex gap-2">
                        <button onClick={copyLink}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}>
                          {copied ? <Check className="h-3.5 w-3.5" style={{ color: "#34d399" }} /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                        <a href={formUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </a>
                        <Link href="/qr" target="_blank"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#e5e7eb" }}>
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
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4b5563" }}>Expiring This Week</p>
            <Link href="/renewals" className="text-xs font-semibold transition-colors" style={{ color: "#f97316" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fb923c")}
              onMouseLeave={e => (e.currentTarget.style.color = "#f97316")}>
              View all →
            </Link>
          </div>
          <div className="rounded-2xl overflow-hidden" style={CARD}>
            {expiringSoonList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <CalendarX className="h-9 w-9" style={{ color: "#1f2937" }} />
                <p className="text-sm font-medium" style={{ color: "#6b7280" }}>No members expiring this week</p>
              </div>
            ) : (
              <div>
                {expiringSoonList.map((m, idx) => {
                  const days = daysUntil(m.expiryDate);
                  const isToday = days === 0;
                  const isOverdue = days !== null && days < 0;
                  return (
                    <div key={m.id}
                      className="flex items-center justify-between px-5 py-3.5 transition-colors"
                      style={{ borderBottom: idx < expiringSoonList.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: "#161616" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "#161616")}
                    >
                      <div className="min-w-0 flex-1">
                        <Link href={`/members/${m.id}`} className="font-semibold text-sm text-white hover:text-orange-400 transition-colors">
                          {toTitleCase(m.fullName)}
                        </Link>
                        <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>{m.memberId} · {m.phone}</p>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        {isToday ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                            <AlertTriangle className="h-3 w-3" /> Today
                          </span>
                        ) : isOverdue ? (
                          <span className="text-xs font-bold" style={{ color: "#6b7280" }}>Expired</span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-1 rounded-lg"
                            style={days !== null && days <= 2
                              ? { background: "rgba(239,68,68,0.12)", color: "#f87171" }
                              : { background: "rgba(245,158,11,0.12)", color: "#fbbf24" }}>
                            {days}d left
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Staff still checked in ── */}
      {staffCheckedIn.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(245,158,11,0.1)", background: "rgba(245,158,11,0.05)" }}>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl p-1.5" style={{ background: "rgba(245,158,11,0.12)" }}>
                <LogOut className="h-4 w-4" style={{ color: "#fbbf24" }} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Staff Still Checked In</h3>
                <p className="text-[11px]" style={{ color: "#d97706" }}>Shifts will auto-close at end time</p>
              </div>
              <span className="ml-1 text-xs font-bold rounded-full px-2 py-0.5" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
                {staffCheckedIn.length}
              </span>
            </div>
            <Link href="/employee-attendance" className="text-xs font-semibold flex items-center gap-0.5 transition-colors" style={{ color: "#d97706" }}>
              View all →
            </Link>
          </div>
          <div>
            {staffCheckedIn.map((s, idx) => {
              const checkedInAt = new Date(s.checkInTime);
              const elapsed = Date.now() - checkedInAt.getTime();
              const hoursIn = Math.floor(elapsed / 3600000);
              const minsIn = Math.floor((elapsed % 3600000) / 60000);
              return (
                <div key={s.shiftId}
                  className="flex items-center justify-between px-5 py-3 transition-colors"
                  style={{ borderBottom: idx < staffCheckedIn.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24" }}>
                      {toTitleCase(s.fullName).split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{toTitleCase(s.fullName)}</p>
                      <p className="text-xs" style={{ color: "#4b5563" }}>{s.role.replace(/_/g, " ")} · {s.employeeId}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "#fbbf24" }}>
                      <Clock className="h-3 w-3" />
                      {hoursIn > 0 ? `${hoursIn}h ${minsIn}m` : `${minsIn}m`} in
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>
                      since {checkedInAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Widgets ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#4b5563" }}>Attendance Trend</p>
          <TodayAttendanceWidget trend={attendanceTrend} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#4b5563" }}>Inactive Members</p>
          <InactiveMembersAlert members={inactiveMembers} />
        </div>
      </div>

      {/* ── Collections ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#4b5563" }}>Revenue Breakdown</p>
        <CollectionsWidget yosFitness={yosFitnessMonthly} yosStudio={yosStudioMonthly} total={monthPaymentTotal} />
      </div>

    </div>
  );
}
