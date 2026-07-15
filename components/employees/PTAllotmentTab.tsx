"use client";

import { formatCurrency } from "@/lib/utils";
import { ChevronDown, ChevronUp, Users, IndianRupee, Percent } from "lucide-react";
import { useState } from "react";

const CARD = { background: "#161616", border: "1px solid rgba(255,255,255,0.06)" };
const CARD_INNER = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" };

export type PTAllotmentEntry = {
  id: string;
  trainerId: string;
  trainerName: string;
  clientName: string;
  packageType: string;
  totalAmount: number;
  commissionPct: number;
  commissionAmount: number;
  month: number;
  year: number;
  expiryDate: string | null;
  startDate: string | null;
};

type TrainerGroup = {
  trainerId: string;
  trainerName: string;
  entries: PTAllotmentEntry[];
  totalRevenue: number;
  totalEarnings: number;
};

function isActive(expiryDate: string | null): boolean {
  if (!expiryDate) return true;
  return new Date(expiryDate) >= new Date();
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function PTAllotmentTab({ entries }: { entries: PTAllotmentEntry[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const grouped = entries.reduce<Record<string, TrainerGroup>>((acc, e) => {
    if (!acc[e.trainerId]) {
      acc[e.trainerId] = {
        trainerId: e.trainerId,
        trainerName: e.trainerName,
        entries: [],
        totalRevenue: 0,
        totalEarnings: 0,
      };
    }
    acc[e.trainerId].entries.push(e);
    acc[e.trainerId].totalRevenue += e.totalAmount;
    acc[e.trainerId].totalEarnings += e.commissionAmount;
    return acc;
  }, {});

  const trainers = Object.values(grouped).sort((a, b) => b.totalEarnings - a.totalEarnings);
  const grandRevenue = trainers.reduce((s, t) => s + t.totalRevenue, 0);
  const grandEarnings = trainers.reduce((s, t) => s + t.totalEarnings, 0);

  if (trainers.length === 0) {
    return (
      <div className="rounded-2xl p-12 text-center text-gray-500" style={CARD}>
        <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No PT allotments recorded yet.</p>
        <p className="text-xs mt-1 text-gray-600">Assign a trainer when recording a PT payment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Trainers", value: String(trainers.length), color: "#f97316" },
          { label: "Total PT Revenue", value: formatCurrency(grandRevenue), color: "#a3a3a3" },
          { label: "Total Trainer Earnings", value: formatCurrency(grandEarnings), color: "#a78bfa" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4" style={CARD}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Per-trainer cards */}
      {trainers.map((t) => {
        const open = !!expanded[t.trainerId];
        const activeClients = t.entries.filter((e) => isActive(e.expiryDate));
        return (
          <div key={t.trainerId} className="rounded-2xl overflow-hidden" style={CARD}>
            {/* Trainer header */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
              onClick={() => setExpanded((p) => ({ ...p, [t.trainerId]: !open }))}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
                  {t.trainerName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">{t.trainerName}</p>
                  <p className="text-xs text-gray-500">
                    {t.entries.length} client{t.entries.length !== 1 ? "s" : ""}
                    {activeClients.length > 0 && (
                      <span className="ml-1.5 text-emerald-400">· {activeClients.length} active</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-500">Revenue</p>
                  <p className="text-sm font-semibold text-gray-300">{formatCurrency(t.totalRevenue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Earnings</p>
                  <p className="text-sm font-bold text-purple-400">{formatCurrency(t.totalEarnings)}</p>
                </div>
                {open ? <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />}
              </div>
            </button>

            {/* Client list */}
            {open && (
              <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <table className="w-full text-sm">
                  <thead style={{ background: "rgba(255,255,255,0.02)" }}>
                    <tr>
                      {["Client", "Package", "Amount", "Commission", "Earnings", "Period", "Status"].map((h) => (
                        <th key={h} className={`px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider ${
                          h === "Client" || h === "Package" ? "text-left" : h === "Status" ? "text-center" : "text-right"
                        }`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.entries
                      .sort((a, b) => {
                        // active first, then by year/month desc
                        const aActive = isActive(a.expiryDate) ? 0 : 1;
                        const bActive = isActive(b.expiryDate) ? 0 : 1;
                        if (aActive !== bActive) return aActive - bActive;
                        return b.year !== a.year ? b.year - a.year : b.month - a.month;
                      })
                      .map((e, i) => {
                        const active = isActive(e.expiryDate);
                        return (
                          <tr key={e.id} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                            <td className="px-4 py-3 font-medium text-white">{e.clientName}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{e.packageType}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(e.totalAmount)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-orange-400 font-medium">{e.commissionPct}%</span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-purple-400">
                              {formatCurrency(e.commissionAmount)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-gray-500">
                              {e.startDate ? (
                                <span>{formatDate(e.startDate)} → {formatDate(e.expiryDate)}</span>
                              ) : (
                                <span className="text-gray-600">
                                  {new Date(e.year, e.month - 1).toLocaleString("en-IN", { month: "short", year: "numeric" })}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                active
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-gray-500/15 text-gray-500"
                              }`}>
                                {active ? "Active" : "Expired"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                    <tr>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-bold uppercase" colSpan={2}>Total</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-300">{formatCurrency(t.totalRevenue)}</td>
                      <td />
                      <td className="px-4 py-2.5 text-right font-bold text-purple-400">{formatCurrency(t.totalEarnings)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
