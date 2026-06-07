"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, X } from "lucide-react";

type Props = { paymentId: string };

export function VoidReceiptButton({ paymentId }: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function openModal() {
    setReason("");
    setError("");
    setOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setOpen(false);
  }

  async function confirm() {
    const trimmed = reason.trim();
    if (!trimmed) { setError("Please enter a reason before voiding."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/payments/${paymentId}/void`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voidReason: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to void receipt");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="no-print flex items-center gap-1.5 px-3 py-2 border-2 border-red-200 rounded-xl text-sm font-semibold text-red-500 hover:border-red-400 hover:text-red-700 hover:bg-red-50 transition-colors"
      >
        <Ban className="h-3.5 w-3.5" /> Void Receipt
      </button>

      {open && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              width: "100%",
              maxWidth: "440px",
              margin: "0 16px",
              colorScheme: "light",
              color: "#111827",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 24px",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#dc2626",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Ban style={{ width: 16, height: 16 }} /> Void Receipt
              </h2>
              <button
                onClick={closeModal}
                disabled={loading}
                style={{
                  padding: "6px",
                  borderRadius: "8px",
                  border: "none",
                  background: "transparent",
                  cursor: loading ? "not-allowed" : "pointer",
                  color: "#9ca3af",
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Warning */}
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "12px 14px",
                }}
              >
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#dc2626", margin: "0 0 4px" }}>
                  ⚠ This action cannot be undone.
                </p>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                  Voiding this receipt will remove it from all revenue totals and reports.
                  If it is a balance payment, the original receipt's pending amount will be restored.
                  If it is an admission or renewal, the member's membership dates will be recalculated.
                </p>
              </div>

              {/* Reason */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "6px",
                  }}
                >
                  Reason for voiding <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setError(""); }}
                  disabled={loading}
                  rows={3}
                  placeholder="e.g. Entered duplicate receipt, wrong amount, cancelled membership…"
                  style={{
                    width: "100%",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    color: "#111827",
                    backgroundColor: "#ffffff",
                    resize: "vertical",
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {error && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#dc2626",
                    fontWeight: 500,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #f3f4f6",
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={closeModal}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#6b7280",
                  background: "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirm}
                disabled={loading || !reason.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 20px",
                  background:
                    loading || !reason.trim() ? "#fca5a5" : "#dc2626",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#fff",
                  cursor: loading || !reason.trim() ? "not-allowed" : "pointer",
                  boxShadow: loading || !reason.trim() ? "none" : "0 4px 12px rgba(220,38,38,0.3)",
                }}
              >
                <Ban style={{ width: 15, height: 15 }} />
                {loading ? "Voiding…" : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
