"use client";

import { useState } from "react";
import { ChevronRight, UserCog } from "lucide-react";

type Form = { phone: string; whatsapp: string; emergencyContact: string; emergencyPhone: string };

const field = {
  background: "#111", border: "1px solid #2a2a2a", color: "#fff",
  borderRadius: "0.75rem", padding: "0.7rem 0.9rem", fontSize: "0.9rem", width: "100%", outline: "none",
} as const;
const label = "block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5";

export function MyDetailsCard({ pin }: { pin: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({ phone: "", whatsapp: "", emergencyContact: "", emergencyPhone: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function call(body: object) {
    const res = await fetch("/api/member/profile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, ...body }),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    setMsg(null);
    if (next && !loaded) {
      setLoading(true);
      const { ok, data } = await call({ action: "get" });
      setLoading(false);
      if (ok) { setForm({ phone: data.phone ?? "", whatsapp: data.whatsapp ?? "", emergencyContact: data.emergencyContact ?? "", emergencyPhone: data.emergencyPhone ?? "" }); setLoaded(true); }
      else setMsg({ ok: false, text: data.error ?? "Could not load your details." });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const { ok, data } = await call({ action: "update", ...form });
      if (ok) {
        setForm({ phone: data.phone, whatsapp: data.whatsapp, emergencyContact: data.emergencyContact, emergencyPhone: data.emergencyPhone });
        setMsg({ ok: true, text: "Saved. Your details are up to date." });
      } else setMsg({ ok: false, text: data.error ?? "Could not save. Please try again." });
    } catch {
      setMsg({ ok: false, text: "Network error. Check your connection and try again." });
    } finally { setSaving(false); }
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="rounded-3xl col-span-2" style={{ background: "#1c1c1c" }}>
      <button type="button" onClick={toggle} className="flex items-center gap-3 w-full p-5 text-left active:opacity-70">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(168,85,247,0.14)" }}>
          <UserCog className="h-6 w-6 text-purple-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">My Details</p>
          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Update your phone and emergency contact</p>
        </div>
        <ChevronRight className="h-4 w-4 transition-transform" style={{ color: "#374151", transform: open ? "rotate(90deg)" : "none" }} />
      </button>

      {open && (
        <form onSubmit={save} className="px-5 pb-5 space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <>
              <div>
                <label className={label}>Mobile number</label>
                <input type="tel" inputMode="tel" autoComplete="tel" required value={form.phone} onChange={set("phone")} placeholder="10-digit mobile" style={field} />
              </div>
              <div>
                <label className={label}>WhatsApp number</label>
                <input type="tel" inputMode="tel" value={form.whatsapp} onChange={set("whatsapp")} placeholder="Same as mobile if left blank" style={field} />
              </div>
              <div>
                <label className={label}>Emergency contact name</label>
                <input type="text" value={form.emergencyContact} onChange={set("emergencyContact")} maxLength={80} placeholder="e.g. Parent or spouse" style={field} />
              </div>
              <div>
                <label className={label}>Emergency contact number</label>
                <input type="tel" inputMode="tel" value={form.emergencyPhone} onChange={set("emergencyPhone")} placeholder="10-digit mobile" style={field} />
              </div>
              {msg && (
                <p role="alert" className="text-sm font-medium rounded-xl px-3 py-2"
                  style={msg.ok
                    ? { background: "rgba(34,197,94,0.12)", color: "#4ade80" }
                    : { background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{msg.text}</p>
              )}
              <button type="submit" disabled={saving || !loaded}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
