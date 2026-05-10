"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePayrollAction, markPayrollPaid } from "@/lib/actions/payroll";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

type PayrollRecord = {
  id: string;
  month: number; year: number;
  presentDays: number; absentDays: number; halfDays: number;
  weeklyOffs: number; leaveDays: number; workingDays: number;
  grossSalary: any; deductions: any; bonus: any; netSalary: any;
  isPaid: boolean; paidDate: Date | null; paidMode: string | null;
  employee: { fullName: string; role: string; salaryType: string; employeeId: string };
};

type Props = {
  records: PayrollRecord[];
  month: number;
  year: number;
  userRole: UserRole;
};

export function PayrollClient({ records, month, year, userRole }: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

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
      toast({ title: "Payroll generated!", description: `${r.count} employees processed.` });
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  async function handleMarkPaid(id: string) {
    setMarkingId(id);
    try {
      await markPayrollPaid(id, "CASH");
      toast({ title: "Marked as paid!" });
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setMarkingId(null);
    }
  }

  function exportCSV() {
    const rows = [
      ["Employee", "ID", "Role", "Present", "Absent", "Half", "Working Days", "Gross", "Deductions", "Net", "Paid"],
      ...records.map((r) => [
        r.employee.fullName, r.employee.employeeId, r.employee.role,
        r.presentDays, r.absentDays, r.halfDays, r.workingDays,
        Number(r.grossSalary), Number(r.deductions), Number(r.netSalary),
        r.isPaid ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
  }

  const totalNet = records.reduce((sum, r) => sum + Number(r.netSalary), 0);
  const totalGross = records.reduce((sum, r) => sum + Number(r.grossSalary), 0);
  const paidCount = records.filter((r) => r.isPaid).length;

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 border">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-semibold text-gray-900 min-w-[140px] text-center">
            {getMonthName(month)} {year}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 border">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={records.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          {canEdit && (
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Generate Payroll
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">Total Payable</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalNet)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">Gross Salary</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalGross)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">Paid / Total</p>
          <p className="text-2xl font-bold text-gray-900">{paidCount} / {records.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {records.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="mb-3">No payroll generated for this month yet.</p>
            {canEdit && (
              <Button size="sm" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Generate Now
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Present</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Absent</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Half</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Working Days</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Gross</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Deductions</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Net Salary</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.employee.fullName}</p>
                      <p className="text-xs text-gray-400">{r.employee.employeeId} · {r.employee.role.replace("_", " ")}</p>
                    </td>
                    <td className="text-center px-3 py-3 text-green-700 font-medium">{r.presentDays}</td>
                    <td className="text-center px-3 py-3 text-red-600 font-medium">{r.absentDays}</td>
                    <td className="text-center px-3 py-3 text-yellow-600 font-medium">{r.halfDays}</td>
                    <td className="text-center px-3 py-3 text-gray-600">{r.workingDays}</td>
                    <td className="text-right px-3 py-3 text-gray-700">{formatCurrency(Number(r.grossSalary))}</td>
                    <td className="text-right px-3 py-3 text-red-600">-{formatCurrency(Number(r.deductions))}</td>
                    <td className="text-right px-4 py-3 font-bold text-gray-900">{formatCurrency(Number(r.netSalary))}</td>
                    <td className="text-center px-4 py-3">
                      {r.isPaid ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                        </span>
                      ) : canEdit ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkPaid(r.id)}
                          disabled={markingId === r.id}
                          className="text-xs h-7"
                        >
                          {markingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Paid"}
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-gray-50">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-700" colSpan={5}>Total</td>
                  <td className="text-right px-3 py-3 font-semibold text-gray-700">{formatCurrency(totalGross)}</td>
                  <td className="text-right px-3 py-3 font-semibold text-red-600">
                    -{formatCurrency(records.reduce((s, r) => s + Number(r.deductions), 0))}
                  </td>
                  <td className="text-right px-4 py-3 font-bold text-gray-900 text-base">{formatCurrency(totalNet)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
