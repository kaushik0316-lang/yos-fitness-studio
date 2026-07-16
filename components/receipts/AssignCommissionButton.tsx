"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Percent, Loader2, Trash2, Plus, X } from "lucide-react";
import { setPaymentCommissions, removeCommissionFromPayment } from "@/lib/actions/commissions";
import { toTitleCase } from "@/lib/utils/titleCase";
import { toast } from "@/hooks/use-toast";

type Trainer = { id: string; fullName: string };

type ExistingEntry = {
  id: string;
  trainerId: string;
  trainerName: string;
  commissionPct: number;
  commissionAmount: number;
};

type Props = {
  paymentId: string;
  paymentAmount: number;
  memberName: string;
  packageName: string;
  trainers: Trainer[];
  existing: ExistingEntry[];
};

type Row = { trainerId: string; pct: string };

function makeRows(existing: ExistingEntry[]): Row[] {
  if (existing.length === 0) return [{ trainerId: "", pct: "" }];
  return existing.map((e) => ({ trainerId: e.trainerId, pct: String(e.commissionPct) }));
}

export function AssignCommissionButton({ paymentId, paymentAmount, memberName, packageName, trainers, existing }: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows]       = useState<Row[]>(() => makeRows(existing));

  const hasExisting = existing.length > 0;

  function updateRow(i: number, field: keyof Row, val: string) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function addRow() {
    if (rows.length >= 3) return;
    setRows((prev) => [...prev, { trainerId: "", pct: "" }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalPct = rows.reduce((s, r) => s + (parseFloat(r.pct) || 0), 0);

  async function handleSave() {
    const valid = rows.filter((r) => r.trainerId && parseFloat(r.pct) > 0);
    if (valid.length === 0) {
      toast({ title: "Select at least one trainer and enter %", variant: "destructive" });
      return;
    }
    // Warn but allow >100% in case of rounding or different base amounts
    setLoading(true);
    try {
      await setPaymentCommissions({
        paymentId,
        clientName:  memberName,
        packageType: packageName,
        totalAmount: paymentAmount,
        entries: valid.map((r) => ({ trainerId: r.trainerId, commissionPct: parseFloat(r.pct) })),
      });
      toast({ title: valid.length > 1 ? "Commission split saved" : "Commission saved" });
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveAll() {
    setLoading(true);
    try {
      await removeCommissionFromPayment(paymentId);
      toast({ title: "Commission removed" });
      setOpen(false);
      setRows([{ trainerId: "", pct: "" }]);
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const buttonLabel = hasExisting
    ? existing.length > 1
      ? `Commission · split (${existing.length})`
      : `Commission · ${existing[0].commissionPct}%`
    : "Assign Commission";

  return (
    <>
      <button
        onClick={() => { setRows(makeRows(existing)); setOpen(true); }}
        className="flex items-center gap-2 px-4 py-2 border-2 rounded-xl text-sm font-semibold transition-colors"
        style={hasExisting
          ? { borderColor: "rgba(249,115,22,0.5)", color: "#f97316", background: "rgba(249,115,22,0.06)" }
          : { borderColor: "#e5e7eb", color: "#6b7280" }
        }
      >
        <Percent className="h-3.5 w-3.5" />
        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900">Trainer Commission</p>
              <div className="flex items-center gap-2">
                {hasExisting && (
                  <button onClick={handleRemoveAll} disabled={loading} className="text-red-400 hover:text-red-600 transition-colors" title="Remove all commissions">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Bill info */}
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span className="font-semibold text-gray-700">{memberName}</span>
              {" · "}₹{paymentAmount.toLocaleString("en-IN")}
            </div>

            {/* Trainer rows */}
            <div className="space-y-3">
              {rows.map((row, i) => {
                const pctNum = parseFloat(row.pct) || 0;
                const preview = row.trainerId && pctNum ? Math.round(paymentAmount * pctNum) / 100 : 0;
                return (
                  <div key={i} className="rounded-xl border border-gray-100 p-3 space-y-2 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Trainer {rows.length > 1 ? i + 1 : ""}
                      </span>
                      {rows.length > 1 && (
                        <button onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-400 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={row.trainerId}
                        onChange={(e) => updateRow(i, "trainerId", e.target.value)}
                        className="col-span-1 border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                        style={{ color: "#111827" }}
                      >
                        <option value="">— Trainer —</option>
                        {trainers.map((t) => (
                          <option key={t.id} value={t.id}>{toTitleCase(t.fullName.toLowerCase())}</option>
                        ))}
                      </select>
                      <div className="relative">
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={row.pct}
                          onChange={(e) => updateRow(i, "pct", e.target.value)}
                          placeholder="% e.g. 80"
                          className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white pr-6"
                          style={{ color: "#111827" }}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                      </div>
                    </div>
                    {preview > 0 && row.trainerId && (
                      <p className="text-xs font-bold" style={{ color: "#f97316" }}>
                        Gets: ₹{preview.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Total % indicator when multiple rows */}
              {rows.length > 1 && totalPct > 0 && (
                <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold ${totalPct > 100 ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"}`}>
                  <span>Total commission</span>
                  <span>{totalPct.toFixed(1)}% = ₹{Math.round(paymentAmount * totalPct / 100).toLocaleString("en-IN")}</span>
                </div>
              )}

              {/* Add trainer button */}
              {rows.length < 3 && (
                <button
                  onClick={addRow}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-orange-500 transition-colors border-2 border-dashed border-gray-200 hover:border-orange-300"
                >
                  <Plus className="h-3.5 w-3.5" /> Add another trainer
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setOpen(false)} disabled={loading}
                className="flex-1 py-2 border rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ background: "#f97316" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
