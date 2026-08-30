"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, User, Calendar, CreditCard,
  Clock, RotateCcw, CheckCircle, MessageSquare, AlertTriangle, MapPin, Link2Off, BellOff,
  Mail, ShieldAlert, Shield, Activity, Settings, LayoutList,
} from "lucide-react";
import { EditMemberButton } from "@/components/members/EditMemberButton";
import { DeleteMemberButton } from "@/components/members/DeleteMemberButton";
import { toggleDoNotDisturb, toggleKioskCheckin, setMemberPin } from "@/lib/actions/members";
import { toTitleCase } from "@/lib/utils/titleCase";
import { WaConfirmButton } from "@/components/whatsapp/WaConfirmButton";
import { WaHistory } from "@/components/whatsapp/WaHistory";
import { MemberPhotoUpload } from "@/components/members/MemberPhotoUpload";
import { MarkAttendanceDialog } from "@/components/members/MarkAttendanceDialog";
import { formatDate, formatCurrency, daysUntil, daysAgo, MEMBER_STATUS_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { UserRole, MemberStatus } from "@prisma/client";

function calcAge(dateOfBirth: Date | string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

type WaLog = { id: string; waType: string | null; sentByName: string | null; sentAt: Date | null; createdAt: Date };

type Props = {
  member: any; packages: any[];
  trainers: { id: string; fullName: string; role: string }[];
  userRole: UserRole; userId: string;
  waLogs?: WaLog[];
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active", EXPIRED: "Expired", FROZEN: "Frozen",
  INACTIVE: "Inactive", PROSPECT: "Prospect",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ADMISSION: "Admission", RENEWAL: "Renewal", BALANCE: "Balance",
};

type Tab = "overview" | "attendance" | "history" | "settings";

export function MemberDetail({ member, packages, trainers, userRole, userId, waLogs = [] }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [showAttendance, setShowAttendance] = useState(false);
  const [dnd, setDnd] = useState<boolean>(member.doNotDisturb ?? false);
  const [dndLoading, setDndLoading] = useState(false);
  const [kioskCheckin, setKioskCheckin] = useState<boolean>(member.allowKioskCheckin ?? false);
  const [kioskLoading, setKioskLoading] = useState(false);
  const [currentPin, setCurrentPin] = useState<string | null>(member.pin ?? null);
  const [pinInput, setPinInput] = useState("");
  const [pinEditing, setPinEditing] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");

  const daysLeft = member.expiryDate ? daysUntil(member.expiryDate) : null;
  const lastVisit = member.lastAttendanceDate ? daysAgo(member.lastAttendanceDate) : null;

  const expiryStatus =
    daysLeft === null ? null :
    daysLeft < 0 ? "expired" :
    daysLeft <= 3 ? "critical" :
    daysLeft <= 7 ? "soon" : "ok";

  const renewalMsg = (() => {
    const firstName = toTitleCase(member.fullName);
    const expStr = member.expiryDate
      ? new Date(member.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
      : null;
    if (expiryStatus === "expired" && expStr)
      return `Hi ${firstName}!\n\nYour Yos Fitness Studio membership expired on *${expStr}*.\n\nWe'd love to have you back — come in to renew and keep your fitness journey going!\n\nSee you soon!\n– Team Yos`;
    if (expStr)
      return `Hi ${firstName}!\n\nJust a friendly reminder that your Yos Fitness Studio membership is expiring on *${expStr}*.\n\nRenew now to keep your streak going without a break!\n\nSee you at the studio!\n– Team Yos`;
    return `Hi ${firstName}!\n\nYour Yos Fitness Studio membership is due for renewal. Come in to renew and keep training!\n\n– Team Yos`;
  })();

  // Merged payment+membership rows: all payments, with date range from membership data
  const mergedPayments = member.payments.map((p: any) => {
    const ms = member.memberships?.find((m: any) => {
      if (p.expiryDate && m.expiryDate) {
        return new Date(p.expiryDate).toDateString() === new Date(m.expiryDate).toDateString();
      }
      return false;
    });
    return { ...p, membershipStart: ms?.startDate ?? p.startDate ?? null, membershipExpiry: ms?.expiryDate ?? p.expiryDate ?? null };
  });

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview",   label: "Overview",   icon: <User className="h-3.5 w-3.5" /> },
    { id: "attendance", label: "Attendance",  icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "history",    label: "History",     icon: <LayoutList className="h-3.5 w-3.5" /> },
    { id: "settings",   label: "Settings",    icon: <Settings className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="max-w-4xl space-y-0">

      {/* ── Top bar: back + name + status ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/members" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          {userRole === "ADMIN" && (
            <DeleteMemberButton memberDbId={member.id} memberId={member.memberId} memberName={member.fullName} />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(userRole === "ADMIN" || userRole === "FRONT_DESK") && member.phone && (
            <WaConfirmButton
              memberId={member.id}
              phone={member.phone}
              message={`Hi ${toTitleCase(member.fullName)}! 👋 Welcome to Yos Fitness Studio.\n\nYour Member ID is *${member.memberId}*.\n\nSet up your member portal to view attendance and membership details:\n👉 https://yosfitnessstudio.in/member-portal?setup=1\n\nSee you at the gym! 💪`}
              waType="WELCOME"
              label="Send Welcome"
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
              style={{ background: "#25d366", color: "#fff" }}
            />
          )}
          {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "TRAINER") && (
            <button onClick={() => setShowAttendance(true)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
              <CheckCircle className="h-3.5 w-3.5" /> Check In
            </button>
          )}
          {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "ACCOUNTANT") && (
            <Link href={`/payments/new?memberId=${member.id}`}
              className="flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
              <CreditCard className="h-3.5 w-3.5" /> Record Payment
            </Link>
          )}
        </div>
      </div>

      {/* ── Member identity + stats strip ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <MemberPhotoUpload memberId={member.id} fullName={member.fullName} photoUrl={member.photoUrl ?? null} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-extrabold text-gray-900">{toTitleCase(member.fullName)}</h1>
              <span className={cn("px-2 py-0.5 rounded-lg text-xs font-bold", MEMBER_STATUS_COLORS[member.status as MemberStatus])}>
                {STATUS_LABELS[member.status] ?? member.status}
              </span>
              <EditMemberButton member={member} />
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{member.memberId}</p>
          </div>
        </div>

        {/* Package name */}
        {(() => {
          const pkgName = (() => {
            if (member.expiryDate && member.memberships?.length) {
              const exp = new Date(member.expiryDate).toDateString();
              const match = member.memberships.find((ms: any) => ms.expiryDate && new Date(ms.expiryDate).toDateString() === exp);
              if (match?.package?.name) return match.package.name;
            }
            return member.memberships?.[0]?.package?.name ?? member.currentPackage?.name ?? null;
          })();
          return pkgName ? (
            <p className="text-xs text-gray-400 mt-2 font-medium">
              <span className="text-gray-600">Package:</span> {pkgName}
            </p>
          ) : null;
        })()}

        {/* 3 key stats inline */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {/* Expiry */}
          <div className={cn("rounded-xl px-3 py-2.5 border text-center",
            expiryStatus === "expired" || expiryStatus === "critical" ? "bg-red-50 border-red-200" :
            expiryStatus === "soon" ? "bg-amber-50 border-amber-200" :
            "bg-gray-50 border-gray-200"
          )}>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Expiry</p>
            {member.expiryDate ? (
              <>
                <p className="text-xs font-bold text-gray-900">{formatDate(member.expiryDate)}</p>
                <p className={cn("text-[10px] font-semibold mt-0.5",
                  daysLeft! < 0 ? "text-red-600" : daysLeft! <= 7 ? "text-orange-600" : "text-emerald-600"
                )}>
                  {daysLeft! < 0 ? `${Math.abs(daysLeft!)}d ago` : daysLeft === 0 ? "Today" : `${daysLeft}d left`}
                </p>
              </>
            ) : <p className="text-xs text-gray-400">—</p>}
          </div>

          {/* Visits */}
          <div className="rounded-xl px-3 py-2.5 border bg-gray-50 border-gray-200 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Visits</p>
            <p className="text-lg font-extrabold text-gray-900">{member._count?.attendances ?? 0}</p>
          </div>

          {/* Last check-in */}
          <div className={cn("rounded-xl px-3 py-2.5 border text-center",
            lastVisit === null ? "bg-gray-50 border-gray-200" :
            lastVisit >= 7 ? "bg-red-50 border-red-200" :
            lastVisit >= 4 ? "bg-orange-50 border-orange-200" :
            "bg-emerald-50 border-emerald-200"
          )}>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Last Visit</p>
            {lastVisit !== null ? (
              <p className={cn("text-xs font-bold",
                lastVisit >= 7 ? "text-red-700" : lastVisit >= 4 ? "text-orange-700" : "text-emerald-700"
              )}>
                {lastVisit === 0 ? "Today" : lastVisit === 1 ? "Yesterday" : `${lastVisit}d ago`}
              </p>
            ) : <p className="text-xs text-gray-400">No visits</p>}
          </div>
        </div>

        {/* Renewal + WA reminder if expired/expiring */}
        {(expiryStatus === "expired" || expiryStatus === "critical" || expiryStatus === "soon") &&
          (userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "ACCOUNTANT") && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <Link href={`/payments/new?memberId=${member.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-orange-700 transition-colors">
              <RotateCcw className="h-3 w-3" /> Renew →
            </Link>
            {member.phone && (
              <WaConfirmButton
                memberId={member.id} phone={member.phone} message={renewalMsg}
                waType="RENEWAL" label="WA Reminder"
                className="inline-flex items-center gap-1 text-xs font-bold bg-transparent border-0 p-0 cursor-pointer"
                style={{ color: "#25d366" }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-xs font-semibold transition-colors",
                tab === t.id
                  ? "text-orange-600 border-b-2 border-orange-500 bg-orange-50/40"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              )}>
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ── */}
        {tab === "overview" && (
          <div className="p-5 space-y-4">
            {/* Profile info */}
            <div className="space-y-2.5">
              <a href={`tel:${member.phone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-orange-600 transition-colors group">
                <div className="bg-gray-100 group-hover:bg-orange-100 rounded-lg p-1.5 transition-colors flex-shrink-0">
                  <Phone className="h-3.5 w-3.5 text-gray-500 group-hover:text-orange-600 transition-colors" />
                </div>
                <span className="font-medium">{member.phone}</span>
              </a>
              {member.whatsapp && member.whatsapp !== member.phone && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="bg-gray-100 rounded-lg p-1.5 flex-shrink-0"><MessageSquare className="h-3.5 w-3.5 text-gray-500" /></div>
                  <span>{member.whatsapp}</span>
                </div>
              )}
              {member.gender && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="bg-gray-100 rounded-lg p-1.5 flex-shrink-0"><User className="h-3.5 w-3.5 text-gray-500" /></div>
                  <span className="capitalize">{member.gender.toLowerCase()}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="bg-gray-100 rounded-lg p-1.5 flex-shrink-0"><Calendar className="h-3.5 w-3.5 text-gray-500" /></div>
                <span>Joined {formatDate(member.joinDate)}</span>
              </div>
              {member.address && (
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <div className="bg-gray-100 rounded-lg p-1.5 mt-0.5 flex-shrink-0"><MapPin className="h-3.5 w-3.5 text-gray-500" /></div>
                  <span>{toTitleCase(member.address)}</span>
                </div>
              )}
              {member.email && (
                <a href={`mailto:${member.email}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-orange-600 transition-colors group">
                  <div className="bg-gray-100 group-hover:bg-orange-100 rounded-lg p-1.5 flex-shrink-0 transition-colors"><Mail className="h-3.5 w-3.5 text-gray-500 group-hover:text-orange-600 transition-colors" /></div>
                  <span className="truncate">{member.email}</span>
                </a>
              )}
              {(member.emergencyContact || member.emergencyPhone) && (
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <div className="bg-gray-100 rounded-lg p-1.5 mt-0.5 flex-shrink-0"><ShieldAlert className="h-3.5 w-3.5 text-gray-500" /></div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Emergency</p>
                    {member.emergencyContact && <p className="font-medium">{toTitleCase(member.emergencyContact)}</p>}
                    {member.emergencyPhone && <a href={`tel:${member.emergencyPhone}`} className="hover:text-orange-600">{member.emergencyPhone}</a>}
                  </div>
                </div>
              )}
            </div>

            {/* Health & Body */}
            {(member.dateOfBirth || member.weight || member.height || member.bloodGroup || member.intentionOfJoining || member.healthConditions) && (
              <div className="pt-4 border-t border-gray-100 space-y-2.5">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Health &amp; Body</p>
                {member.dateOfBirth && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="bg-gray-100 rounded-lg p-1.5 flex-shrink-0"><Calendar className="h-3.5 w-3.5 text-gray-500" /></div>
                    <span>{formatDate(member.dateOfBirth)} <span className="text-gray-400 text-xs">(age {calcAge(member.dateOfBirth)})</span></span>
                  </div>
                )}
                {(member.weight || member.height) && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="bg-gray-100 rounded-lg p-1.5 flex-shrink-0"><User className="h-3.5 w-3.5 text-gray-500" /></div>
                    <div className="flex gap-4">
                      {member.weight && <span><span className="font-medium">{Number(member.weight)} kg</span> <span className="text-gray-400 text-xs">weight</span></span>}
                      {member.height && <span><span className="font-medium">{Number(member.height)} cm</span> <span className="text-gray-400 text-xs">height</span></span>}
                    </div>
                  </div>
                )}
                {member.bloodGroup && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="bg-gray-100 rounded-lg p-1.5 flex-shrink-0"><AlertTriangle className="h-3.5 w-3.5 text-gray-500" /></div>
                    <span><span className="font-medium">{member.bloodGroup}</span> <span className="text-gray-400 text-xs">blood group</span></span>
                  </div>
                )}
                {member.intentionOfJoining && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="bg-gray-100 rounded-lg p-1.5 flex-shrink-0"><CheckCircle className="h-3.5 w-3.5 text-gray-500" /></div>
                    <span><span className="font-medium">{member.intentionOfJoining}</span> <span className="text-gray-400 text-xs">goal</span></span>
                  </div>
                )}
                {member.healthConditions && (
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <div className="bg-gray-100 rounded-lg p-1.5 mt-0.5 flex-shrink-0"><MessageSquare className="h-3.5 w-3.5 text-gray-500" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Health / Injuries</p>
                      <p className="leading-relaxed">{member.healthConditions}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trainer */}
            {member.trainer && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assigned Trainer</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-700">
                    {member.trainer.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{toTitleCase(member.trainer.fullName)}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            {member.notes && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Notes</p>
                <p className="text-sm text-gray-600 leading-relaxed">{member.notes}</p>
              </div>
            )}

            {/* WA History */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp History ({waLogs.length})
              </h3>
              <WaHistory logs={waLogs} />
            </div>
          </div>
        )}

        {/* ── Tab: Attendance ── */}
        {tab === "attendance" && (
          <div className="p-5">
            {member.attendances.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No attendance records yet.</p>
            ) : (
              <div className="space-y-1">
                {member.attendances.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{formatDate(a.date)}</span>
                      {a.remarks && <span className="ml-2 text-xs text-gray-400 italic">{a.remarks}</span>}
                    </div>
                    <span className="text-xs text-gray-400 font-mono">
                      {a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: History (merged payments + memberships) ── */}
        {tab === "history" && (
          <div className="p-5">
            {member.payments.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No payment records yet.</p>
            ) : (
              <div className="space-y-2">
                {mergedPayments.map((p: any) => (
                  <Link key={p.id} href={`/payments/${p.id}/receipt?from=member`}
                    className={cn(
                      "flex items-start justify-between p-3.5 rounded-xl border transition-colors group",
                      p.isVoided ? "bg-gray-50 border-gray-100 opacity-60" : "bg-gray-50 hover:bg-violet-50 hover:border-violet-100 border-transparent"
                    )}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className={cn("font-bold text-sm", p.isVoided ? "text-gray-400 line-through" : "text-gray-900 group-hover:text-violet-700 transition-colors")}>
                          {formatCurrency(Number(p.amount))}
                          {Number(p.discount) > 0 && <span className="ml-1 text-xs font-normal text-emerald-600">−{formatCurrency(Number(p.discount))}</span>}
                        </p>
                        {p.receiptNumber && <span className="text-xs font-mono text-gray-400">#{p.receiptNumber}</span>}
                        {p.isVoided && <span className="px-1.5 py-0.5 bg-red-100 text-red-500 text-[10px] font-bold rounded border border-red-200">VOID</span>}
                        <span className={cn("text-xs px-2 py-0.5 rounded-md font-bold",
                          p.paymentType === "ADMISSION" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{p.package?.name ?? p.categoryLabel ?? "General"} · {p.paymentMode}</p>
                      {(p.membershipStart || p.membershipExpiry) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {p.membershipStart ? formatDate(p.membershipStart) : "—"} → {p.membershipExpiry ? formatDate(p.membershipExpiry) : "—"}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.date)}{p.collectedBy?.name ? ` · ${p.collectedBy.name}` : ""}</p>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <span className={cn("text-xs px-2.5 py-1 rounded-lg font-bold",
                        p.company === "YOS_FITNESS" ? "bg-orange-100 text-orange-700" : "bg-indigo-100 text-indigo-700"
                      )}>
                        {p.company === "YOS_FITNESS" ? "YF" : "YFS"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Settings ── */}
        {tab === "settings" && (
          <div className="p-5 space-y-0 divide-y divide-gray-100">
            {/* Kiosk check-in */}
            {userRole === "ADMIN" && (
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className={`h-4 w-4 ${kioskCheckin ? "text-emerald-500" : "text-gray-400"}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Allow kiosk check-in</p>
                    <p className="text-xs text-gray-400">Enable self-service check-in even if expired / inactive</p>
                  </div>
                </div>
                <button
                  onClick={async () => { setKioskLoading(true); const next = !kioskCheckin; setKioskCheckin(next); await toggleKioskCheckin(member.id, next); setKioskLoading(false); }}
                  disabled={kioskLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${kioskCheckin ? "bg-emerald-500" : "bg-gray-200"} ${kioskLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${kioskCheckin ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            )}

            {/* Kiosk PIN */}
            {userRole === "ADMIN" && (
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className={`h-4 w-4 ${currentPin ? "text-emerald-500" : "text-gray-400"}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Kiosk PIN</p>
                      <p className="text-xs text-gray-400">4-digit code for self check-in</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentPin && !pinEditing && (
                      <span className="font-mono text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">{currentPin}</span>
                    )}
                    {!pinEditing && (
                      <button onClick={() => { setPinEditing(true); setPinInput(""); setPinError(""); }}
                        className="text-xs font-semibold text-orange-500 hover:text-orange-600 underline underline-offset-2">
                        {currentPin ? "Change" : "Set PIN"}
                      </button>
                    )}
                    {currentPin && !pinEditing && (
                      <button
                        onClick={async () => { setPinLoading(true); try { await setMemberPin(member.id, null); setCurrentPin(null); } catch (e: any) { setPinError(e.message); } finally { setPinLoading(false); } }}
                        disabled={pinLoading}
                        className="text-xs font-semibold text-red-400 hover:text-red-600 underline underline-offset-2 disabled:opacity-40">
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {pinEditing && (
                  <div className="mt-3 flex items-center gap-2">
                    <input type="text" inputMode="numeric" maxLength={4} value={pinInput}
                      onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }}
                      placeholder="Enter 4-digit PIN"
                      className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-orange-400 tracking-widest"
                      autoFocus />
                    <button
                      onClick={async () => { setPinLoading(true); setPinError(""); try { await setMemberPin(member.id, pinInput); setCurrentPin(pinInput); setPinEditing(false); } catch (e: any) { setPinError(e.message); } finally { setPinLoading(false); } }}
                      disabled={pinInput.length !== 4 || pinLoading}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors">
                      {pinLoading ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => { setPinEditing(false); setPinError(""); }}
                      className="px-3 py-1.5 border border-gray-200 text-gray-400 text-xs font-semibold rounded-lg hover:border-gray-300">
                      Cancel
                    </button>
                  </div>
                )}
                {pinError && <p className="mt-1.5 text-xs text-red-500 font-medium">{pinError}</p>}
              </div>
            )}

            {/* Mute reminders */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <BellOff className={`h-4 w-4 ${dnd ? "text-orange-500" : "text-gray-400"}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Mute reminders</p>
                  <p className="text-xs text-gray-400">Stop all automated WhatsApp messages</p>
                </div>
              </div>
              <button
                onClick={async () => { setDndLoading(true); const next = !dnd; setDnd(next); await toggleDoNotDisturb(member.id, next); setDndLoading(false); }}
                disabled={dndLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${dnd ? "bg-orange-500" : "bg-gray-200"} ${dndLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${dnd ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Terms & Conditions */}
            {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
              <div className="flex items-center justify-between py-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ShieldAlert className={`h-4 w-4 flex-shrink-0 ${member.termsAcceptedAt ? "text-green-500" : "text-orange-400"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-700">Terms &amp; Conditions</p>
                    <p className="text-xs text-gray-400">
                      {member.termsAcceptedAt
                        ? `Accepted ${new Date(member.termsAcceptedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                        : "Not yet accepted"}
                    </p>
                  </div>
                </div>
                {!member.termsAcceptedAt && member.phone && (
                  <WaConfirmButton
                    memberId={member.id} phone={member.phone}
                    message={`Hi ${toTitleCase(member.fullName)}! Please accept your Yos Fitness membership terms (takes 1 minute):\n👉 https://yosfitnessstudio.in/terms-accept?id=${member.memberId}`}
                    waType="TERMS" label="Send"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-colors"
                    style={{ background: "rgba(37,211,102,0.1)", color: "#16a34a", border: "1px solid rgba(37,211,102,0.25)" }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <MarkAttendanceDialog
        open={showAttendance} onClose={() => setShowAttendance(false)}
        member={{ id: member.id, memberId: member.memberId, fullName: member.fullName }}
        userId={userId}
      />
    </div>
  );
}
