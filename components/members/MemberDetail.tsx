"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, User, Calendar, Package, CreditCard,
  Clock, RotateCcw, CheckCircle, MessageSquare, AlertTriangle, MapPin, Link2Off, BellOff,
  Mail, ShieldAlert, ChevronDown, ChevronUp,
} from "lucide-react";
import { EditMemberButton } from "@/components/members/EditMemberButton";
import { toggleDoNotDisturb } from "@/lib/actions/members";
import { toTitleCase } from "@/lib/utils/titleCase";
import { MemberPhotoUpload } from "@/components/members/MemberPhotoUpload";
import { MarkAttendanceDialog } from "@/components/members/MarkAttendanceDialog";
import {
  formatDate, formatCurrency, daysUntil, daysAgo,
  MEMBER_STATUS_COLORS, getInitials,
} from "@/lib/utils";

function calcAge(dateOfBirth: Date | string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
import { cn } from "@/lib/utils";
import type { UserRole, MemberStatus } from "@prisma/client";

type Props = {
  member: any; packages: any[];
  trainers: { id: string; fullName: string; role: string }[];
  userRole: UserRole; userId: string;
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active", EXPIRED: "Expired", FROZEN: "Frozen",
  INACTIVE: "Inactive", PROSPECT: "Prospect",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ADMISSION: "Admission", RENEWAL: "Renewal", BALANCE: "Balance",
};

export function MemberDetail({ member, packages, trainers, userRole, userId }: Props) {
  const [showPayment, setShowPayment] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [dnd, setDnd] = useState<boolean>(member.doNotDisturb ?? false);
  const [dndLoading, setDndLoading] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [showAllAttendances, setShowAllAttendances] = useState(false);
  const [showAllMemberships, setShowAllMemberships] = useState(false);

  const PAYMENTS_DEFAULT = 5;
  const ATTENDANCES_DEFAULT = 10;
  const MEMBERSHIPS_DEFAULT = 5;

  const visiblePayments = showAllPayments ? member.payments : member.payments.slice(0, PAYMENTS_DEFAULT);
  const visibleAttendances = showAllAttendances ? member.attendances : member.attendances.slice(0, ATTENDANCES_DEFAULT);
  const visibleMemberships = showAllMemberships ? member.memberships : member.memberships.slice(0, MEMBERSHIPS_DEFAULT);

  const daysLeft = member.expiryDate ? daysUntil(member.expiryDate) : null;
  const lastVisit = member.lastAttendanceDate ? daysAgo(member.lastAttendanceDate) : null;

  const expiryStatus =
    daysLeft === null ? null :
    daysLeft < 0 ? "expired" :
    daysLeft <= 3 ? "critical" :
    daysLeft <= 7 ? "soon" : "ok";

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Back + Actions ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/members" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Members
        </Link>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "TRAINER") && (
            <button
              onClick={() => setShowAttendance(true)}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              <CheckCircle className="h-4 w-4" />
              Check In
            </button>
          )}
          {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "ACCOUNTANT") && (
            <Link
              href={`/payments/new?memberId=${member.id}`}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              <CreditCard className="h-4 w-4" />
              Record Payment
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Profile ── */}
        <div className="flex flex-col gap-4">
          {/* Identity card — second on mobile, first on desktop */}
          <div className="order-2 lg:order-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Avatar */}
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center gap-4 mb-4">
                <MemberPhotoUpload
                  memberId={member.id}
                  fullName={member.fullName}
                  photoUrl={member.photoUrl ?? null}
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-xl font-extrabold text-gray-900">{toTitleCase(member.fullName)}</h2>
                    <EditMemberButton member={member} />
                  </div>
                  <p className="text-sm text-gray-400 font-mono mt-0.5">{member.memberId}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tap photo to update</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", MEMBER_STATUS_COLORS[member.status as MemberStatus])}>
                  {STATUS_LABELS[member.status] ?? member.status}
                </span>
              </div>

              {/* Info fields */}
              <div className="mt-5 space-y-3">
                <a href={`tel:${member.phone}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-orange-600 transition-colors group">
                  <div className="bg-gray-100 group-hover:bg-orange-100 rounded-lg p-1.5 transition-colors">
                    <Phone className="h-3.5 w-3.5 text-gray-500 group-hover:text-orange-600 transition-colors" />
                  </div>
                  <span className="font-medium">{member.phone}</span>
                </a>
                {member.whatsapp && member.whatsapp !== member.phone && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="bg-gray-100 rounded-lg p-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <span>{member.whatsapp}</span>
                  </div>
                )}
                {member.gender && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="bg-gray-100 rounded-lg p-1.5">
                      <User className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <span>{member.gender}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="bg-gray-100 rounded-lg p-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <span>Joined {formatDate(member.joinDate)}</span>
                </div>
                {member.address && (
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <div className="bg-gray-100 rounded-lg p-1.5 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <span>{member.address}</span>
                  </div>
                )}
                {member.email && (
                  <a href={`mailto:${member.email}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-orange-600 transition-colors group">
                    <div className="bg-gray-100 group-hover:bg-orange-100 rounded-lg p-1.5 transition-colors">
                      <Mail className="h-3.5 w-3.5 text-gray-500 group-hover:text-orange-600 transition-colors" />
                    </div>
                    <span className="truncate">{member.email}</span>
                  </a>
                )}
                {(member.emergencyContact || member.emergencyPhone) && (
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <div className="bg-gray-100 rounded-lg p-1.5 mt-0.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Emergency</p>
                      {member.emergencyContact && <p className="font-medium">{member.emergencyContact}</p>}
                      {member.emergencyPhone && (
                        <a href={`tel:${member.emergencyPhone}`} className="hover:text-orange-600 transition-colors">
                          {member.emergencyPhone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Health & Body — only rendered if at least one field is present */}
              {(member.dateOfBirth || member.weight || member.height || member.bloodGroup || member.intentionOfJoining || member.healthConditions) && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Health &amp; Body</p>
                  <div className="space-y-2.5">
                    {member.dateOfBirth && (
                      <div className="flex items-start gap-3 text-sm text-gray-600">
                        <div className="bg-gray-100 rounded-lg p-1.5 mt-0.5 flex-shrink-0">
                          <Calendar className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Date of Birth</p>
                          <p className="font-medium">{formatDate(member.dateOfBirth)} <span className="text-gray-400 font-normal">(age {calcAge(member.dateOfBirth)})</span></p>
                        </div>
                      </div>
                    )}
                    {(member.weight || member.height) && (
                      <div className="flex items-start gap-3 text-sm text-gray-600">
                        <div className="bg-gray-100 rounded-lg p-1.5 mt-0.5 flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <div className="flex gap-4 flex-wrap">
                          {member.weight && <span><span className="font-medium">{Number(member.weight)} kg</span> <span className="text-gray-400 text-xs">weight</span></span>}
                          {member.height && <span><span className="font-medium">{Number(member.height)} cm</span> <span className="text-gray-400 text-xs">height</span></span>}
                        </div>
                      </div>
                    )}
                    {member.bloodGroup && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="bg-gray-100 rounded-lg p-1.5 flex-shrink-0">
                          <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <span><span className="font-medium">{member.bloodGroup}</span> <span className="text-gray-400 text-xs">blood group</span></span>
                      </div>
                    )}
                    {member.intentionOfJoining && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="bg-gray-100 rounded-lg p-1.5 flex-shrink-0">
                          <CheckCircle className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <span><span className="font-medium">{member.intentionOfJoining}</span> <span className="text-gray-400 text-xs">goal</span></span>
                      </div>
                    )}
                    {member.healthConditions && (
                      <div className="flex items-start gap-3 text-sm text-gray-600">
                        <div className="bg-gray-100 rounded-lg p-1.5 mt-0.5 flex-shrink-0">
                          <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Health / Injuries</p>
                          <p className="leading-relaxed">{member.healthConditions}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {member.trainer && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Assigned Trainer</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-700">
                      {member.trainer.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{toTitleCase(member.trainer.fullName)}</span>
                  </div>
                </div>
              )}

              {member.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Notes</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{member.notes}</p>
                </div>
              )}

              {/* Do Not Disturb toggle */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellOff className={`h-4 w-4 ${dnd ? "text-orange-500" : "text-gray-400"}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Mute reminders</p>
                    <p className="text-xs text-gray-400">Stop all automated WhatsApp messages</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setDndLoading(true);
                    const next = !dnd;
                    setDnd(next);
                    await toggleDoNotDisturb(member.id, next);
                    setDndLoading(false);
                  }}
                  disabled={dndLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    dnd ? "bg-orange-500" : "bg-gray-200"
                  } ${dndLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    dnd ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Membership status card — first on mobile, second on desktop */}
          <div className="order-1 lg:order-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Package className="h-3.5 w-3.5" />
              Membership
            </p>

            {member.currentPackage ? (
              /* ── Normal: package linked ── */
              <div className="space-y-3">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                  <p className="font-bold text-gray-900 text-sm">{member.currentPackage.name}</p>
                  {member.startDate && <p className="text-xs text-gray-500 mt-0.5">Started {formatDate(member.startDate)}</p>}
                </div>
                {member.expiryDate && (
                  <div className={cn("rounded-xl p-3 border",
                    expiryStatus === "expired" ? "bg-red-50 border-red-200" :
                    expiryStatus === "critical" ? "bg-red-50 border-red-200" :
                    expiryStatus === "soon" ? "bg-amber-50 border-amber-200" :
                    "bg-gray-50 border-gray-200"
                  )}>
                    <p className="text-xs text-gray-500 mb-1">Expiry date</p>
                    <p className="font-bold text-gray-900 text-sm">{formatDate(member.expiryDate)}</p>
                    {daysLeft !== null && (
                      <p className={cn("text-xs font-semibold mt-1",
                        daysLeft < 0 ? "text-red-600" :
                        daysLeft <= 7 ? "text-orange-600" : "text-emerald-600"
                      )}>
                        {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` :
                         daysLeft === 0 ? "Expires today!" :
                         `${daysLeft} days remaining`}
                      </p>
                    )}
                    {(expiryStatus === "expired" || expiryStatus === "critical") && (userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "ACCOUNTANT") && (
                      <Link
                        href={`/payments/new?memberId=${member.id}`}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-red-700 hover:text-orange-700 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Renew →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ) : member.expiryDate || member.startDate ? (
              /* ── Package not linked yet, but dates exist ── */
              <div className="space-y-3">
                {/* Package row — greyed out placeholder */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-2">
                  <Link2Off className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                  <p className="text-xs text-gray-400 italic">Package name not on record</p>
                  {member.startDate && (
                    <p className="text-xs text-gray-400 ml-auto">from {formatDate(member.startDate)}</p>
                  )}
                </div>
                {member.expiryDate && (
                  <div className={cn("rounded-xl p-3 border",
                    expiryStatus === "expired" ? "bg-red-50 border-red-200" :
                    expiryStatus === "critical" ? "bg-red-50 border-red-200" :
                    expiryStatus === "soon" ? "bg-amber-50 border-amber-200" :
                    "bg-gray-50 border-gray-200"
                  )}>
                    <p className="text-xs text-gray-500 mb-1">Expiry date</p>
                    <p className="font-bold text-gray-900 text-sm">{formatDate(member.expiryDate)}</p>
                    {daysLeft !== null && (
                      <p className={cn("text-xs font-semibold mt-1",
                        daysLeft < 0 ? "text-red-600" :
                        daysLeft <= 7 ? "text-orange-600" : "text-emerald-600"
                      )}>
                        {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` :
                         daysLeft === 0 ? "Expires today!" :
                         `${daysLeft} days remaining`}
                      </p>
                    )}
                    {(expiryStatus === "expired" || expiryStatus === "critical") && (userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "ACCOUNTANT") && (
                      <Link
                        href={`/payments/new?memberId=${member.id}`}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-red-700 hover:text-orange-700 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Renew →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* ── No membership data at all ── */
              <p className="text-sm text-gray-400">No active membership</p>
            )}

            {lastVisit !== null && (
              <div className={cn("rounded-xl p-3 border mt-3",
                lastVisit >= 7 ? "bg-red-50 border-red-200" :
                lastVisit >= 4 ? "bg-orange-50 border-orange-200" :
                "bg-emerald-50 border-emerald-200"
              )}>
                <p className="text-xs text-gray-500 mb-1">Last check-in</p>
                <p className={cn("font-bold text-sm",
                  lastVisit >= 7 ? "text-red-700" : lastVisit >= 4 ? "text-orange-700" : "text-emerald-700"
                )}>
                  {lastVisit === 0 ? "Today" : lastVisit === 1 ? "Yesterday" : `${lastVisit} days ago`}
                </p>
                {lastVisit >= 4 && (
                  <p className="text-xs text-orange-600 flex items-center gap-1 mt-0.5 font-medium">
                    <AlertTriangle className="h-3 w-3" /> Follow up needed
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: History ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Attendance */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <div className="bg-blue-50 rounded-xl p-1.5">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              Recent Attendance
              <span className="text-xs text-gray-400 font-normal ml-1">({member.attendances.length} records)</span>
            </h3>
            {member.attendances.length === 0 ? (
              <p className="text-sm text-gray-400">No attendance records yet.</p>
            ) : (
              <>
                <div className="space-y-1 pr-1">
                  {visibleAttendances.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <span className="text-sm font-medium text-gray-800">{formatDate(a.date)}</span>
                      <span className="text-xs text-gray-400 font-mono">
                        {a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                      {a.remarks && <span className="text-xs text-gray-400 italic truncate max-w-[120px]">{a.remarks}</span>}
                    </div>
                  ))}
                </div>
                {member.attendances.length > ATTENDANCES_DEFAULT && (
                  <button
                    onClick={() => setShowAllAttendances(p => !p)}
                    className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {showAllAttendances ? (
                      <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" /> Show {member.attendances.length - ATTENDANCES_DEFAULT} more</>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Payments */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <div className="bg-violet-50 rounded-xl p-1.5">
                <CreditCard className="h-4 w-4 text-violet-600" />
              </div>
              Payment History
              <span className="text-xs text-gray-400 font-normal ml-1">({member.payments.length})</span>
            </h3>
            {member.payments.length === 0 ? (
              <p className="text-sm text-gray-400">No payments recorded.</p>
            ) : (
              <>
                <div className="space-y-2 pr-1">
                  {visiblePayments.map((p: any) => (
                    <Link key={p.id} href={`/payments/${p.id}/receipt?from=member`} className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-violet-50 hover:border-violet-100 border border-transparent rounded-xl transition-colors group">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900 text-sm group-hover:text-violet-700 transition-colors">{formatCurrency(Number(p.amount))}</p>
                          {p.receiptNumber && (
                            <span className="text-xs text-gray-400 font-mono">#{p.receiptNumber}</span>
                          )}
                          <span className="text-xs text-gray-500 font-medium">
                            {PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{p.package?.name ?? "General"} · {p.paymentMode}</p>
                        <p className="text-xs text-gray-400">{formatDate(p.date)} · {p.collectedBy?.name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className={cn("text-xs px-2.5 py-1 rounded-lg font-bold",
                          p.company === "YOS_FITNESS" ? "bg-orange-100 text-orange-700" : "bg-indigo-100 text-indigo-700"
                        )}>
                          {p.company === "YOS_FITNESS" ? "YF" : "YFS"}
                        </span>
                        <CreditCard className="h-3.5 w-3.5 text-gray-300 group-hover:text-violet-400 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
                {member.payments.length > PAYMENTS_DEFAULT && (
                  <button
                    onClick={() => setShowAllPayments(p => !p)}
                    className="mt-3 flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                  >
                    {showAllPayments ? (
                      <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" /> Show {member.payments.length - PAYMENTS_DEFAULT} more</>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Memberships */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <div className="bg-emerald-50 rounded-xl p-1.5">
                <RotateCcw className="h-4 w-4 text-emerald-600" />
              </div>
              Membership History
              <span className="text-xs text-gray-400 font-normal ml-1">({member.memberships.length})</span>
            </h3>
            {member.memberships.length === 0 ? (
              <p className="text-sm text-gray-400">No memberships yet.</p>
            ) : (
              <>
                <div className="space-y-2 pr-1">
                  {visibleMemberships.map((ms: any) => (
                    <div key={ms.id} className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{ms.package.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(ms.startDate)} → {formatDate(ms.expiryDate)}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-bold text-gray-900 text-sm">{formatCurrency(Number(ms.amount))}</p>
                        {Number(ms.discount) > 0 && (
                          <p className="text-xs text-emerald-600">−{formatCurrency(Number(ms.discount))}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {member.memberships.length > MEMBERSHIPS_DEFAULT && (
                  <button
                    onClick={() => setShowAllMemberships(p => !p)}
                    className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                  >
                    {showAllMemberships ? (
                      <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" /> Show {member.memberships.length - MEMBERSHIPS_DEFAULT} more</>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
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
