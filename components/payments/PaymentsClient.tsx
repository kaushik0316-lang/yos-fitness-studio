"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, CreditCard, IndianRupee, TrendingUp } from "lucide-react";
import { RecordPaymentDialog } from "@/components/payments/RecordPaymentDialog";
import { formatDate, formatCurrency, COMPANY_COLORS, cn } from "@/lib/utils";
import type { Company, UserRole } from "@prisma/client";

type Payment = {
  id: string; date: Date; amount: any; discount: any; pendingAmount: any;
  paymentMode: string; company: Company; transactionRef: string | null; notes: string | null;
  receiptNumber: number | null; paymentType: string | null;
  member: { id: string; memberId: string; fullName: string; phone: string };
  package: { name: string } | null;
  collectedBy: { name: string };
  soldBy: { fullName: string; employeeId: string } | null;
};

type Stats = { company: Company; _sum: { amount: any }; _count: number }[];

type Props = {
  payments: Payment[]; total: number; page: number; pageSize: number;
  todayStats: Stats; monthStats: Stats; packages: any[];
  members: { id: string; memberId: string; fullName: string; primaryCompany: Company }[];
  userRole: UserRole; userId: string;
};

const MODE_STYLES: Record<string, string> = {
  CASH: "bg-emerald-50 text-emerald-700",
  UPI: "bg-blue-50 text-blue-700",
  CARD: "bg-violet-50 text-violet-700",
  BANK_TRANSFER: "bg-indigo-50 text-indigo-700",
  CHEQUE: "bg-amber-50 text-amber-700",
  FREE: "bg-gray-100 text-gray-500",
};

const MODE_LABELS: Record<string, string> = {
  CASH: "💵 Cash", UPI: "📱 UPI", CARD: "💳 Card",
  BANK_TRANSFER: "🏦 Bank", CHEQUE: "📄 Cheque", FREE: "🎁 Free",
};

export function PaymentsClient({ payments, total, page, pageSize, todayStats, monthStats, packages, members, userRole, userId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showRecord, setShowRecord] = useState(false);

  function updateQuery(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "" || value === "ALL") params.delete(key);
    else params.set(key, value);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const todayYF = Number(todayStats.find((s) => s.company === "YOS_FITNESS")?._sum.amount ?? 0);
  const todayYFS = Number(todayStats.find((s) => s.company === "YOS_FITNESS_STUDIO")?._sum.amount ?? 0);
  const monthYF = Number(monthStats.find((s) => s.company === "YOS_FITNESS")?._sum.amount ?? 0);
  const monthYFS = Number(monthStats.find((s) => s.company === "YOS_FITNESS_STUDIO")?._sum.amount ?? 0);
  const totalPages = Math.ceil(total / pageSize);

  const statCards = [
    { label: "Today · Yos Fitness", value: todayYF, icon: IndianRupee, strip: "bg-orange-500", iconBg: "bg-orange-50", iconColor: "text-orange-600" },
    { label: "Today · Yos Studio", value: todayYFS, icon: IndianRupee, strip: "bg-indigo-500", iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Month · Yos Fitness", value: monthYF, icon: TrendingUp, strip: "bg-orange-500", iconBg: "bg-orange-50", iconColor: "text-orange-600" },
    { label: "Month · Yos Studio", value: monthYFS, icon: TrendingUp, strip: "bg-indigo-500", iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
  ];

  return (
    <div className="space-y-5">
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden">
            <div className={`absolute inset-x-0 top-0 h-[3px] ${s.strip}`} />
            <div className="flex items-start justify-between mt-1">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest truncate">{s.label}</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-1.5">{formatCurrency(s.value)}</p>
              </div>
              <div className={`${s.iconBg} rounded-xl p-2.5`}>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-3">
        <select
          defaultValue={searchParams.get("company") ?? "ALL"}
          onChange={(e) => updateQuery("company", e.target.value)}
          className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400 transition-colors bg-white text-gray-700 font-medium"
        >
          <option value="ALL">Both Companies</option>
          <option value="YOS_FITNESS">Yos Fitness</option>
          <option value="YOS_FITNESS_STUDIO">Yos Studio</option>
        </select>

        <select
          defaultValue={searchParams.get("mode") ?? "ALL"}
          onChange={(e) => updateQuery("mode", e.target.value)}
          className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400 transition-colors bg-white text-gray-700 font-medium"
        >
          <option value="ALL">All Modes</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="FREE">Free</option>
        </select>

        <div className="ml-auto" />
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                {["Receipt #", "Date", "Member", "Amount", "Mode", "Package", "Company", "Sold By"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
                      <CreditCard className="h-12 w-12" />
                      <p className="text-sm text-gray-400 font-medium">No payments found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-orange-50/20 transition-colors last:border-0">
                    <td className="px-5 py-4">
                      {p.receiptNumber ? (
                        <Link href={`/payments/${p.id}/receipt`} className="font-mono text-sm font-bold text-orange-600 hover:underline">
                          #{p.receiptNumber}
                        </Link>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="px-5 py-4">
                      <Link href={`/members/${p.member.id}`} className="font-semibold text-gray-900 hover:text-orange-600 transition-colors">
                        {p.member.fullName}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">{p.member.memberId}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">{formatCurrency(Number(p.amount))}</p>
                      {Number(p.discount) > 0 && (
                        <p className="text-xs text-emerald-600">−{formatCurrency(Number(p.discount))} off</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold", MODE_STYLES[p.paymentMode] ?? "bg-gray-100 text-gray-600")}>
                        {MODE_LABELS[p.paymentMode] ?? p.paymentMode}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{p.package?.name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-4">
                      <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold", COMPANY_COLORS[p.company])}>
                        {p.company === "YOS_FITNESS" ? "Yos Fitness" : "Yos Studio"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {p.soldBy
                        ? <span className="font-semibold text-orange-600">{p.soldBy.fullName}</span>
                        : <span className="text-gray-400 text-xs">Common</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">{total} total payments</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => updateQuery("page", String(p))}
                  className={cn("w-8 h-8 rounded-xl text-xs font-semibold transition-colors", p === page ? "bg-orange-500 text-white shadow-md shadow-orange-200" : "hover:bg-gray-200 text-gray-500")}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <RecordPaymentDialog
        open={showRecord}
        onClose={() => setShowRecord(false)}
        member={{ id: "", memberId: "", fullName: "Select member…", primaryCompany: "YOS_FITNESS" as Company }}
        packages={packages}
        userId={userId}
      />
    </div>
  );
}
