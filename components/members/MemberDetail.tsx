"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, User, Calendar, Package, CreditCard,
  Clock, RotateCcw, CheckCircle, MessageSquare, AlertTriangle, MapPin,
} from "lucide-react";
import { RenewMembershipDialog } from "@/components/members/RenewMembershipDialog";
import { RecordPaymentDialog } from "@/components/payments/RecordPaymentDialog";
import { MarkAttendanceDialog } from "@/components/members/MarkAttendanceDialog";
import {
  formatDate, formatCurrency, daysUntil, daysAgo,
  COMPANY_COLORS, MEMBER_STATUS_COLORS, getInitials,
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { UserRole, Company, MemberStatus } from "@prisma/client";

type Props = {
  member: any; packages: any[];
  trainers: { id: string; fullName: string; role: string }[];
  userRole: UserRole; userId: string;
};

export function MemberDetail({ member, packages, trainers, userRole, userId }: Props) {
  const [showRenew, setShowRenew] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);

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
        <div className="flex items-center gap-2 flex-wrap">
          {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "TRAINER") && (
            <button
              onClick={() => setShowAttendance(true)}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl text-sm font-bold transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Check In
            </button>
          )}
          {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "ACCOUNTANT") && (
            <button
              onClick={() => setShowPayment(true)}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-violet-300 text-violet-700 hover:bg-violet-50 rounded-xl text-sm font-bold transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Record Payment
            </button>
          )}
          {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
            <button
              onClick={() => setShowRenew(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-orange-200"
            >
              <RotateCcw className="h-4 w-4" />
              Renew Membership
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Profile ── */}
        <div className="space-y-4">
          {/* Identity card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Orange header band */}
            <div className="h-20 bg-gradient-to-br from-orange-400 to-orange-600 relative">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            </div>
            {/* Avatar */}
            <div className="px-6 pb-5">
              <div className="-mt-8 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white text-xl font-extrabold shadow-xl shadow-orange-300/40 border-4 border-white">
                  {getInitials(member.fullName)}
                </div>
              </div>

              <h2 className="text-xl font-extrabold text-gray-900">{member.fullName}</h2>
              <p className="text-sm text-gray-400 font-mono mt-0.5">{member.memberId}</p>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", MEMBER_STATUS_COLORS[member.status as MemberStatus])}>
                  {member.status}
                </span>
                <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", COMPANY_COLORS[member.primaryCompany as Company])}>
                  {member.primaryCompany === "YOS_FITNESS" ? "Yos Fitness" : "Yos Studio"}
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
              </div>

              {member.trainer && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Assigned Trainer</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-700">
                      {member.trainer.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{member.trainer.fullName}</span>
                  </div>
                </div>
              )}

              {member.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Notes</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{member.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Membership status card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Package className="h-3.5 w-3.5" />
              Membership
            </p>

            {member.currentPackage ? (
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
                  </div>
                )}
              </div>
            ) : (
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
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                {member.attendances.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-medium text-gray-800">{formatDate(a.date)}</span>
                    <span className="text-xs text-gray-400 font-mono">
                      {a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                    {a.remarks && <span className="text-xs text-gray-400 italic truncate max-w-[120px]">{a.remarks}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <div className="bg-violet-50 rounded-xl p-1.5">
                <CreditCard className="h-4 w-4 text-violet-600" />
              </div>
              Payment History
            </h3>
            {member.payments.length === 0 ? (
              <p className="text-sm text-gray-400">No payments recorded.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {member.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{formatCurrency(Number(p.amount))}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.package?.name ?? "General"} · {p.paymentMode}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.date)} · {p.collectedBy?.name}</p>
                    </div>
                    <span className={cn("text-xs px-2.5 py-1 rounded-lg font-bold flex-shrink-0",
                      p.company === "YOS_FITNESS" ? "bg-orange-100 text-orange-700" : "bg-indigo-100 text-indigo-700"
                    )}>
                      {p.company === "YOS_FITNESS" ? "YF" : "YFS"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Memberships */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <div className="bg-emerald-50 rounded-xl p-1.5">
                <RotateCcw className="h-4 w-4 text-emerald-600" />
              </div>
              Membership History
            </h3>
            {member.memberships.length === 0 ? (
              <p className="text-sm text-gray-400">No memberships yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {member.memberships.map((ms: any) => (
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
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <RenewMembershipDialog
        open={showRenew} onClose={() => setShowRenew(false)}
        member={{ id: member.id, memberId: member.memberId, fullName: member.fullName, primaryCompany: member.primaryCompany }}
        packages={packages} userId={userId}
      />
      <RecordPaymentDialog
        open={showPayment} onClose={() => setShowPayment(false)}
        member={{ id: member.id, memberId: member.memberId, fullName: member.fullName, primaryCompany: member.primaryCompany }}
        packages={packages} userId={userId}
      />
      <MarkAttendanceDialog
        open={showAttendance} onClose={() => setShowAttendance(false)}
        member={{ id: member.id, memberId: member.memberId, fullName: member.fullName }}
        userId={userId}
      />
    </div>
  );
}
