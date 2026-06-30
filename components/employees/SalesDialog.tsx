"use client";

import { useState, useEffect } from "react";
import { X, ArrowRightLeft, Loader2, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

type Payment = {
  id: string;
  date: string;
  amount: string | number;
  discount: string | number;
  categoryLabel: string | null;
  member: { fullName: string; memberId: string };
  soldBy: { id: string; fullName: string } | null;
};

type Employee = { id: string; fullName: string };

type Props = {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  allEmployees: Employee[];
  onClose: () => void;
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function SalesDialog({ employeeId, employeeName, month, year, allEmployees, onClose }: Props) {
  const router = useRouter();
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [reassigning, setReassign]  = useState<string | null>(null); // paymentId being reassigned
  const [targetEmp, setTargetEmp]   = useState<Record<string, string>>({}); // paymentId → employeeId

  useEffect(() => {
    fetch(`/api/admin/sales?employeeId=${employeeId}&month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((d) => setPayments(d.payments ?? []))
      .finally(() => setLoading(false));
  }, [employeeId, month, year]);

  const total = payments.reduce((s, p) => s + Number(p.amount) - Number(p.discount), 0);
  const others = allEmployees.filter((e) => e.id !== employeeId);

  async function reassign(paymentId: string) {
    const newEmpId = targetEmp[paymentId];
    if (!newEmpId) return;
    setReassign(paymentId);
    try {
      const res = await fetch("/api/admin/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, soldById: newEmpId || null }),
      });
      if (!res.ok) throw new Error("Failed");
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      const empName = allEmployees.find((e) => e.id === newEmpId)?.fullName ?? "Unassigned";
      toast({ title: `Sale reassigned to ${toTitleCase(empName)}` });
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Could not reassign sale.", variant: "destructive" });
    } finally {
      setReassign(null);
    }
  }

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background: "rgba(249,115,22,0.12)" }}>
              <TrendingUp className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{toTitleCase(employeeName)}</h3>
              <p className="text-xs text-gray-500">Sales · {MONTH_NAMES[month - 1]} {year}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: "#6b7280" }}><X className="h-5 w-5" /></button>
        </div>

        {/* Summary */}
        <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(249,115,22,0.04)" }}>
          <p className="text-xs text-gray-500">
            <span className="text-orange-400 font-bold text-sm">{formatCurrency(total)}</span>
            {" "}total from {payments.length} sale{payments.length !== 1 ? "s" : ""}
            {" · "}click a row to reassign it to another trainer
          </p>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
            </div>
          ) : payments.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-600">No sales recorded this month</div>
          ) : (
            payments.map((p) => {
              const net = Number(p.amount) - Number(p.discount);
              const isReassigning = reassigning === p.id;
              const selected = targetEmp[p.id] ?? "";

              return (
                <div key={p.id} className="px-5 py-3 space-y-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {/* Payment info */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{toTitleCase(p.member.fullName)}</p>
                      <p className="text-xs text-gray-500">{p.member.memberId} · {fmt(p.date)}{p.categoryLabel ? ` · ${p.categoryLabel}` : ""}</p>
                    </div>
                    <span className="font-bold text-sm text-white flex-shrink-0">{formatCurrency(net)}</span>
                  </div>

                  {/* Reassign row */}
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                    <select
                      value={selected}
                      onChange={(e) => setTargetEmp((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none"
                      style={{ background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)", color: selected ? "#f9fafb" : "#6b7280" }}
                      disabled={isReassigning}
                    >
                      <option value="">Move to…</option>
                      {others.map((e) => (
                        <option key={e.id} value={e.id}>{toTitleCase(e.fullName)}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => reassign(p.id)}
                      disabled={!selected || isReassigning}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                      style={{ background: selected && !isReassigning ? "linear-gradient(135deg,#f97316,#ea580c)" : "rgba(255,255,255,0.06)", color: selected && !isReassigning ? "#fff" : "#6b7280" }}
                    >
                      {isReassigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Move"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
