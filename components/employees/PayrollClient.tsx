"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, Loader2, Download, Trash2 } from "lucide-react";
import { generatePayrollAction, markPayrollPaid, updateBonus, clearPayrollAction } from "@/lib/actions/payroll";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

const CARD = { background: "#161616", border: "1px solid rgba(255,255,255,0.06)" };
const CARD_INNER = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" };

const PAY_MODES = ["CASH", "UPI", "BANK_TRANSFER"] as const;
type PayMode = typeof PAY_MODES[number];
const PAY_MODE_LABELS: Record<PayMode, string> = { CASH: "Cash", UPI: "UPI", BANK_TRANSFER: "Bank Transfer" };

type PayrollRecord = {
  id: string;
  month: number; year: number;
  presentDays: number; absentDays: number; halfDays: number;
  weeklyOffs: number; leaveDays: number; workingDays: number;
  grossSalary: any; deductions: any; bonus: any; netSalary: any;
  isPaid: boolean; paidDate: Date | null; paidMode: string | null;
  employee: { fullName: string; role: string; salaryType: string; employeeId: string };
};

type Props = { records: PayrollRecord[]; month: number; year: number; userRole: UserRole };

export function PayrollClient({ records, month, year, userRole }: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [payModes, setPayModes] = useState<Record<string, PayMode>>({});
  const [bonuses, setBonuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(records.map((r) => [r.id, String(Number(r.bonus) || 0)]))
  );
  const [savingBonus, setSavingBonus] = useState<string | null>(null);

  const canEdit = userRole === "ADMIN" || userRole === "ACCOUNTANT";

  function prevMonth() {
    const d = new Date(year, month - 2, 1);
    router.push(`/payroll?month=${d.getMonth() + 1}&year=${d.getFullYear()}`);
  }
  function nextMonth() {
    const d = new Date(year, month, 1);
    router.push(`/payroll?month=${d.getMonth() + 1}&year=${d.getFullYear()}`);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const r = await generatePayrollAction(month, year);
      toast({ title: records.length > 0 ? "Payroll regenerated" : "Payroll generated", description: `${r.count} employees processed.` });
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  }

  async function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return; }
    setClearing(true);
    try {
      const r = await clearPayrollAction(month, year);
      toast({ title: "Payroll cleared", description: `${r.deleted} records removed.` });
      setConfirmClear(false);
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setClearing(false); }
  }

  async function handleMarkPaid(id: string) {
    setMarkingId(id);
    try {
      const mode = payModes[id] ?? "CASH";
      await markPayrollPaid(id, mode);
      toast({ title: "Marked as paid", description: PAY_MODE_LABELS[mode] });
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setMarkingId(null); }
  }

  async function handleSaveBonus(id: string) {
    setSavingBonus(id);
    try {
      const bonus = parseFloat(bonuses[id] ?? "0") || 0;
      await updateBonus(id, bonus);
      toast({ title: "Bonus saved" });
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSavingBonus(null); }
  }

  function exportCSV() {
    const rows = [
      ["Employee", "ID", "Role", "Present", "Absent", "Half", "Working Days", "Gross", "Deductions", "Bonus", "Net", "Paid", "Mode"],
      ...records.map((r) => [
        r.employee.fullName, r.employee.employeeId, r.employee.role,
        r.presentDays, r.absentDays, r.halfDays, r.workingDays,
        Number(r.grossSalary), Number(r.deductions), Number(r.bonus), Number(r.netSalary),
        r.isPaid ? "Yes" : "No", r.paidMode ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `payroll-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
  }

  const totalNet   = records.reduce((s, r) => s + Number(r.netSalary), 0);
  const totalGross = records.reduce((s, r) => s + Number(r.grossSalary), 0);
  const totalBonus = records.reduce((s, r) => s + Number(r.bonus), 0);
  const paidCount  = records.filter((r) => r.isPaid).length;

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors" style={CARD_INNER}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-bold text-white min-w-[140px] text-center">{getMonthName(month)} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors" style={CARD_INNER}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 disabled:opacity-40 transition-colors hover:text-white"
            style={CARD_INNER}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          {canEdit && (
            <>
              {records.length > 0 && userRole === "ADMIN" && (
                <button
                  onClick={handleClear}
                  onBlur={() => setConfirmClear(false)}
                  disabled={clearing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                  style={confirmClear
                    ? { background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }
                    : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }
                  }
                >
                  {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {confirmClear ? "Confirm Clear?" : "Undo Payroll"}
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {records.length > 0 ? "Regenerate" : "Generate Payroll"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Payable", value: formatCurrency(totalNet), color: "#f97316" },
          { label: "Gross Salary",  value: formatCurrency(totalGross), color: "#a3a3a3" },
          { label: "Total Bonus",   value: formatCurrency(totalBonus), color: "#a78bfa" },
          { label: "Paid",          value: `${paidCount} / ${records.length}`, color: "#4ade80" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4" style={CARD}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden overflow-x-auto" style={CARD}>
        {records.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="mb-3">No payroll generated for this month yet.</p>
            {canEdit && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 mx-auto px-4 py-2 rounded-lg text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Generate Now
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
              <tr>
                {["Employee", "Present", "Absent", "Half", "Working Days", "Gross", "Deductions", "Bonus", "Net Salary", "Status"].map((h) => (
                  <th key={h} className={cn("px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider",
                    h === "Employee" ? "text-left" : h === "Status" ? "text-center" : "text-right"
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{r.employee.fullName}</p>
                    <p className="text-xs text-gray-500">{r.employee.employeeId} · {r.employee.role.replace("_", " ")}</p>
                  </td>
                  <td className="text-right px-4 py-3 text-emerald-400 font-medium">{r.presentDays}</td>
                  <td className="text-right px-4 py-3 text-red-400 font-medium">{r.absentDays}</td>
                  <td className="text-right px-4 py-3 text-amber-400 font-medium">{r.halfDays}</td>
                  <td className="text-right px-4 py-3 text-gray-400">{r.workingDays}</td>
                  <td className="text-right px-4 py-3 text-gray-300">{formatCurrency(Number(r.grossSalary))}</td>
                  <td className="text-right px-4 py-3 text-red-400">-{formatCurrency(Number(r.deductions))}</td>

                  {/* Bonus cell */}
                  <td className="text-right px-4 py-3">
                    {canEdit && !r.isPaid ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-gray-500 text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={bonuses[r.id] ?? "0"}
                          onChange={(e) => setBonuses((p) => ({ ...p, [r.id]: e.target.value }))}
                          onBlur={() => {
                            const orig = String(Number(r.bonus) || 0);
                            if (bonuses[r.id] !== orig) handleSaveBonus(r.id);
                          }}
                          className="w-20 text-right bg-transparent border-b text-purple-300 font-medium text-sm focus:outline-none focus:border-purple-400"
                          style={{ borderColor: "rgba(255,255,255,0.1)" }}
                        />
                        {savingBonus === r.id && <Loader2 className="h-3 w-3 animate-spin text-purple-400" />}
                      </div>
                    ) : (
                      <span className={cn("font-medium", Number(r.bonus) > 0 ? "text-purple-400" : "text-gray-600")}>
                        {Number(r.bonus) > 0 ? `+${formatCurrency(Number(r.bonus))}` : "—"}
                      </span>
                    )}
                  </td>

                  <td className="text-right px-4 py-3 font-bold text-white">{formatCurrency(Number(r.netSalary))}</td>

                  {/* Status / mark paid */}
                  <td className="text-center px-4 py-3">
                    {r.isPaid ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                        </span>
                        {r.paidMode && (
                          <span className="text-[10px] text-gray-600">{PAY_MODE_LABELS[r.paidMode as PayMode] ?? r.paidMode}</span>
                        )}
                      </div>
                    ) : canEdit ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <select
                          value={payModes[r.id] ?? "CASH"}
                          onChange={(e) => setPayModes((p) => ({ ...p, [r.id]: e.target.value as PayMode }))}
                          className="text-[10px] rounded px-1.5 py-0.5 text-gray-300 font-medium"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                        >
                          {PAY_MODES.map((m) => (
                            <option key={m} value={m}>{PAY_MODE_LABELS[m]}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleMarkPaid(r.id)}
                          disabled={markingId === r.id}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white transition-all disabled:opacity-60"
                          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                        >
                          {markingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Paid"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
              <tr>
                <td className="px-4 py-3 font-bold text-gray-400 text-xs uppercase" colSpan={5}>Total</td>
                <td className="text-right px-4 py-3 font-semibold text-gray-300">{formatCurrency(totalGross)}</td>
                <td className="text-right px-4 py-3 font-semibold text-red-400">
                  -{formatCurrency(records.reduce((s, r) => s + Number(r.deductions), 0))}
                </td>
                <td className="text-right px-4 py-3 font-semibold text-purple-400">
                  {totalBonus > 0 ? `+${formatCurrency(totalBonus)}` : "—"}
                </td>
                <td className="text-right px-4 py-3 font-bold text-white text-base">{formatCurrency(totalNet)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
