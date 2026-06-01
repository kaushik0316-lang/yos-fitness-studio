"use client";

import { useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { updateMember } from "@/lib/actions/members";
import { useRouter } from "next/navigation";

type Props = {
  member: {
    id: string;
    fullName: string;
    phone: string | null;
    whatsapp: string | null;
    gender: string | null;
    address: string | null;
    email: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    notes: string | null;
  };
};

const inputCls = "w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors";
const inputStyle = { background: "#fff", color: "#111827", border: "1px solid #e5e7eb" };

export function EditMemberButton({ member }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName:         member.fullName ?? "",
    phone:            member.phone ?? "",
    whatsapp:         member.whatsapp ?? "",
    gender:           member.gender ?? "",
    address:          member.address ?? "",
    email:            member.email ?? "",
    emergencyContact: member.emergencyContact ?? "",
    emergencyPhone:   member.emergencyPhone ?? "",
    notes:            member.notes ?? "",
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.fullName.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      await updateMember(member.id, form as any);
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors border border-gray-200"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit Details
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="h-4 w-4 text-orange-500" /> Edit Member Details
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              {/* Name */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Full Name *</label>
                <input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className={inputCls + " mt-1"} style={inputStyle} />
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phone</label>
                  <input type="tel" data-no-capitalize value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls + " mt-1"} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">WhatsApp</label>
                  <input type="tel" data-no-capitalize value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={inputCls + " mt-1"} placeholder="If different from phone" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email</label>
                <input type="email" data-no-capitalize value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls + " mt-1"} style={inputStyle} />
              </div>

              {/* Gender */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gender</label>
                <select value={form.gender} onChange={(e) => set("gender", e.target.value)}
                  className={inputCls + " mt-1"}>
                  <option value="">— Select —</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Address</label>
                <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls + " mt-1"} style={inputStyle} />
              </div>

              {/* Emergency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Emergency Contact</label>
                  <input value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} className={inputCls + " mt-1"} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Emergency Phone</label>
                  <input type="tel" data-no-capitalize value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} className={inputCls + " mt-1"} style={inputStyle} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Notes</label>
                <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={inputCls + " mt-1 resize-none"} style={inputStyle} />
              </div>

              {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
