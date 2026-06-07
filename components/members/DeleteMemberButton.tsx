"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";

type Props = {
  memberDbId:  string;
  memberId:    string;
  memberName:  string;
};

export function DeleteMemberButton({ memberDbId, memberId, memberName }: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function openModal() {
    setError("");
    setOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setOpen(false);
  }

  async function confirm() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/members/${memberDbId}/delete`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete member");
      setOpen(false);
      router.push("/members");
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
        className="flex items-center gap-1.5 px-3 py-2 border-2 border-red-200 rounded-xl text-sm font-semibold text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              width: "100%",
              maxWidth: "420px",
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
                <Trash2 style={{ width: 16, height: 16 }} /> Delete Member
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
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
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
                  Permanently deleting{" "}
                  <strong style={{ color: "#111827" }}>{memberName}</strong>{" "}
                  ({memberId}) will remove all their attendance records,
                  memberships, and follow-up notes.
                </p>
              </div>

              <p style={{ fontSize: "13px", color: "#374151", margin: 0 }}>
                Members with active payment records cannot be deleted. Set them to{" "}
                <strong>Inactive</strong> instead.
              </p>

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
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 20px",
                  background: loading ? "#fca5a5" : "#dc2626",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 4px 12px rgba(220,38,38,0.3)",
                }}
              >
                <Trash2 style={{ width: 15, height: 15 }} />
                {loading ? "Deleting…" : `Delete ${memberName.split(" ")[0]}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
