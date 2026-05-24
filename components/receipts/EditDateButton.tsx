"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

type Props = { paymentId: string; currentDate: string };

export function EditDateButton({ paymentId, currentDate }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(currentDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/payments/${paymentId}/edit-date`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="no-print flex items-center gap-1.5 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit Date
      </button>
    );
  }

  return (
    <div className="no-print flex items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border-2 border-orange-400 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-800 outline-none"
      />
      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors"
      >
        <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
      </button>
      <button
        onClick={() => { setEditing(false); setDate(currentDate); setError(""); }}
        className="flex items-center gap-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-gray-300 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
    </div>
  );
}
