"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

type Props = {
  paymentId: string;
  current: {
    memberName: string;
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

const INP: React.CSSProperties = {
  width: "100%",
  border: "2px solid #e5e7eb",
  borderRadius: "8px",
  padding: "6px 12px",
  fontSize: "14px",
  color: "#111827",
  backgroundColor: "#ffffff",
  colorScheme: "light",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const LBL: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "4px",
};

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
          <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "520px", margin: "0 16px", maxHeight: "90vh", overflowY: "auto", colorScheme: "light", color: "#111827" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #f3f4f6" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Pencil style={{ width: 16, height: 16, color: "#f97316" }} /> Edit Receipt
              </h2>
              <button onClick={() => setOpen(false)} style={{ padding: "6px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af" }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Member Name */}
              <div>
                <label style={LBL}>Member Name</label>
                <input style={INP} value={form.memberName}
                  onChange={(e) => set("memberName", e.target.value)} />
              </div>

              {/* Date */}
              <div>
                <label style={LBL}>Bill Date</label>
                <input type="date" style={INP} value={form.date}
                  onChange={(e) => set("date", e.target.value)} />
              </div>

              {/* Amounts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={LBL}>Amount (₹)</label>
                  <input type="number" style={INP} value={form.amount}
                    onChange={(e) => set("amount", Number(e.target.value))} />
                </div>
                <div>
                  <label style={LBL}>Discount (₹)</label>
                  <input type="number" style={INP} value={form.discount}
                    onChange={(e) => set("discount", Number(e.target.value))} />
                </div>
                <div>
                  <label style={LBL}>Pending (₹)</label>
                  <input type="number" style={INP} value={form.pendingAmount}
                    onChange={(e) => set("pendingAmount", Number(e.target.value))} />
                </div>
              </div>

              {/* Payment mode */}
              <div>
                <label style={LBL}>Payment Mode</label>
                <select style={INP} value={form.paymentMode}
                  onChange={(e) => set("paymentMode", e.target.value)}>
                  {MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
                </select>
              </div>

              {/* Category + Period */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={LBL}>Category</label>
                  <input style={INP} value={form.categoryLabel}
                    onChange={(e) => set("categoryLabel", e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Period</label>
                  <input style={INP} value={form.periodLabel}
                    onChange={(e) => set("periodLabel", e.target.value)} />
                </div>
              </div>

              {/* Start + Expiry */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={LBL}>Start Date</label>
                  <input type="date" style={INP} value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)} />
                </div>
                <div>
                  <label style={LBL}>Expiry Date</label>
                  <input type="date" style={INP} value={form.expiryDate}
                    onChange={(e) => set("expiryDate", e.target.value)} />
                </div>
              </div>

              {/* Transaction ref */}
              <div>
                <label style={LBL}>Transaction Ref / UPI ID</label>
                <input style={INP} value={form.transactionRef}
                  onChange={(e) => set("transactionRef", e.target.value)}
                  placeholder="UPI ref, cheque no…" />
              </div>

              {/* Notes */}
              <div>
                <label style={LBL}>Notes</label>
                <input style={INP} value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Optional note…" />
              </div>

              {error && (
                <p style={{ fontSize: "13px", color: "#dc2626", fontWeight: 500, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 12px", margin: 0 }}>{error}</p>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => setOpen(false)}
                style={{ padding: "8px 16px", border: "2px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", fontWeight: 600, color: "#6b7280", background: "#fff", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 20px", background: saving ? "#fdba74" : "#f97316", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 700, color: "#fff", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }}>
                <Check style={{ width: 16, height: 16 }} />
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
