"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Percent, Loader2, Trash2 } from "lucide-react";
import { assignCommissionToPayment, removeCommissionFromPayment } from "@/lib/actions/commissions";
import { toast } from "@/hooks/use-toast";

type Trainer = { id: string; fullName: string };

type Existing = {
  id: string;
  trainerId: string;
  trainerName: string;
  commissionPct: number;
  commissionAmount: number;
} | null;

type Props = {
  paymentId: string;
  paymentAmount: number;
  memberName: string;
  packageName: string;
  trainers: Trainer[];
  existing: Existing;
};

export function AssignCommissionButton({ paymentId, paymentAmount, memberName, packageName, trainers, existing }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trainerId, setTrainerId] = useState(existing?.trainerId ?? "");
  const [pct, setPct] = useState(existing?.commissionPct?.toString() ?? "");

  const pctNum = parseFloat(pct) || 0;
  const preview = pctNum && trainerId ? Math.round(paymentAmount * pctNum) / 100 : 0;

  async function handleSave() {
    if (!trainerId || !pctNum) {
      toast({ title: "Select a trainer and enter %", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await assignCommissionToPayment({
        paymentId,
        trainerId,
        commissionPct: pctNum,
        clientName: memberName,
        packageType: packageName,
        totalAmount: paymentAmount,
      });
      toast({ title: "Commission assigned" });
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setLoading(true);
    try {
      await removeCommissionFromPayment(paymentId);
      toast({ title: "Commission removed" });
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border-2 rounded-xl text-sm font-semibold transition-colors"
        style={existing
          ? { borderColor: "rgba(249,115,22,0.5)", color: "#f97316", background: "rgba(249,115,22,0.06)" }
          : { borderColor: "#e5e7eb", color: "#6b7280" }
        }
      >
        <Percent className="h-3.5 w-3.5" />
        {existing ? `Commission · ${existing.commissionPct}%` : "Assign Commission"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900">Trainer Commission</p>
              {existing && (
                <button onClick={handleRemove} disabled={loading} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span className="font-semibold text-gray-700">{memberName}</span> · ₹{paymentAmount.toLocaleString("en-IN")}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Trainer</label>
                <select
                  value={trainerId}
                  onChange={e => setTrainerId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">— Select trainer —</option>
                  {trainers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Commission %</label>
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={pct} onChange={e => setPct(e.target.value)}
                  placeholder="e.g. 35"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              {preview > 0 && trainerId && (
                <p className="text-xs font-bold" style={{ color: "#f97316" }}>
                  Trainer gets: ₹{preview.toLocaleString("en-IN")}
                </p>
              )}
            </div>

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
