"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { AnnouncementRow, createAnnouncement, updateAnnouncement, toggleAnnouncement, deleteAnnouncement } from "@/lib/actions/announcements";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

const AUDIENCES = [
  { value: "ALL",     label: "Everyone" },
  { value: "ACTIVE",  label: "Active members only" },
  { value: "EXPIRED", label: "Expired members only" },
  { value: "GENERAL", label: "General membership" },
  { value: "PT",      label: "Personal Training" },
  { value: "SEMI",    label: "Semi-Private Coaching" },
  { value: "HIIT",    label: "HIIT Classes" },
];

const BLANK = { title: "", body: "", ctaLabel: "Talk to us", audience: "ALL", expiresAt: "", active: true };

export function AnnouncementsClient({ announcements }: { announcements: AnnouncementRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function openCreate() { setEditing(null); setForm(BLANK); setShowForm(true); }
  function openEdit(a: AnnouncementRow) {
    setEditing(a);
    setForm({
      title: a.title, body: a.body, ctaLabel: a.ctaLabel, audience: a.audience,
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().split("T")[0] : "",
      active: a.active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateAnnouncement(editing.id, { ...form, expiresAt: form.expiresAt || null });
      } else {
        await createAnnouncement({ ...form, expiresAt: form.expiresAt || null });
      }
      setShowForm(false);
      router.refresh();
    } finally { setSaving(false); }
  }

  async function handleToggle(id: string, active: boolean) {
    await toggleAnnouncement(id, !active);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (deleting !== id) { setDeleting(id); return; }
    await deleteAnnouncement(id);
    setDeleting(null);
    router.refresh();
  }

  const audienceLabel = (v: string) => AUDIENCES.find(a => a.value === v)?.label ?? v;

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <Header title="Announcements" subtitle="Shown in the member portal" />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Create button */}
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
          <Plus className="h-4 w-4" /> New Announcement
        </button>

        {/* List */}
        {announcements.length === 0 && (
          <div className="text-center py-16 text-gray-600 text-sm">No announcements yet. Create one to show it in the member portal.</div>
        )}
        {announcements.map((a) => (
          <div key={a.id} className="rounded-2xl p-5 space-y-2"
            style={{ background: "#161616", border: `1px solid ${a.active ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.06)"}`, opacity: a.active ? 1 : 0.5 }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-white text-sm">{a.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(249,115,22,0.12)", color: "#f97316" }}>
                    {audienceLabel(a.audience)}
                  </span>
                  {!a.active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#6b7280" }}>Hidden</span>}
                  {a.expiresAt && <span className="text-[10px] text-gray-600">Expires {new Date(a.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.body}</p>
                <p className="text-[11px] text-gray-700 mt-1">CTA: "{a.ctaLabel}"</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleToggle(a.id, a.active)}
                  className="p-2 rounded-lg text-gray-500 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                  title={a.active ? "Hide" : "Show"}>
                  {a.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => openEdit(a)}
                  className="p-2 rounded-lg text-gray-500 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(a.id)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", color: deleting === a.id ? "#ef4444" : "#6b7280" }}
                  title={deleting === a.id ? "Tap again to confirm" : "Delete"}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="font-bold text-white text-sm">{editing ? "Edit Announcement" : "New Announcement"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-lg">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Try Personal Training this month!"
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                  style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Body</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Short description — 2-3 lines max"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none resize-none"
                  style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">CTA Button</label>
                  <input value={form.ctaLabel} onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                    style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Expires (optional)</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                    style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Show to</label>
                <select value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                  style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              {editing && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-orange-500" />
                  <span className="text-sm text-gray-400">Active (visible in portal)</span>
                </label>
              )}
              <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.body.trim()}
                className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
