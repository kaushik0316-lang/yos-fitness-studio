"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

type Props = {
  paymentId: string;
  current: {
    date: string;
    amount: number;
    discount: number;
    pendingAmount: number;
    paymentMode: string;
    categoryLabel: string;
    periodLabel: string;
    startDate: string;
    expiryDate: string;
    notes: string;
    transactionRef: string;
  };
};

const MODES = ["CASH", "UPI", "CARD", "CHEQUE", "BANK_TRANSFER", "FREE"];
const MODE_LABELS: Record<string, string> = {
  CASH: "Cash", UPI: "GPay / UPI", CARD: "Card",
  CHEQUE: "Cheque", BANK_TRANSFER: "Bank Transfer", FREE: "Free",
};

const inp = "w-full border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 transition-colors";
const lbl = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1";

export function EditReceiptButton({ paymentId, current }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ ...current });

  function set(key: keyof typeof form, val: string | number) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/payments/${paymentId}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setOpen(false);
      router.refresh();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="no-print flex items-center gap-1.5 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit Receipt
      </button>

      {open && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="h-4 w-4 text-orange-500" /> Edit Receipt
              </h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Date */}
              <div>
                <label className={lbl}>Bill Date</label>
                <input type="date" className={inp} value={form.date}
                  onChange={(e) => set("date", e.target.value)} />
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>Amount (₹)</label>
                  <input type="number" className={inp} value={form.amount}
                    onChange={(e) => set("amount", Number(e.target.value))} />
                </div>
                <div>
                  <label className={lbl}>Discount (₹)</label>
                  <input type="number" className={inp} value={form.discount}
                    onChange={(e) => set("discount", Number(e.target.value))} />
                </div>
                <div>
                  <label className={lbl}>Pending (₹)</label>
                  <input type="number" className={inp} value={form.pendingAmount}
                    onChange={(e) => set("pendingAmount", Number(e.target.value))} />
                </div>
              </div>

              {/* Payment mode */}
              <div>
                <label className={lbl}>Payment Mode</label>
                <select className={inp} value={form.paymentMode}
                  onChange={(e) => set("paymentMode", e.target.value)}>
                  {MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
                </select>
              </div>

              {/* Category + Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Category</label>
                  <input className={inp} value={form.categoryLabel}
                    onChange={(e) => set("categoryLabel", e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Period</label>
                  <input className={inp} value={form.periodLabel}
                    onChange={(e) => set("periodLabel", e.target.value)} />
                </div>
              </div>

              {/* Start + Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Start Date</label>
                  <input type="date" className={inp} value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Expiry Date</label>
                  <input type="date" className={inp} value={form.expiryDate}
                    onChange={(e) => set("expiryDate", e.target.value)} />
                </div>
              </div>

              {/* Transaction ref */}
              <div>
                <label className={lbl}>Transaction Ref / UPI ID</label>
                <input className={inp} value={form.transactionRef}
                  onChange={(e) => set("transactionRef", e.target.value)}
                  placeholder="UPI ref, cheque no…" />
              </div>

              {/* Notes */}
              <div>
                <label className={lbl}>Notes</label>
                <input className={inp} value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Optional note…" />
              </div>

              {error && (
                <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setOpen(false)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-gray-300 transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-orange-200 disabled:opacity-50">
                <Check className="h-4 w-4" />
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
