"use client";

import { useState, useTransition } from "react";
import { MessageSquare, RotateCcw, Save, ChevronDown, ChevronUp } from "lucide-react";
import { updateWaTemplate, resetWaTemplate } from "@/lib/actions/waTemplates";

type Template = {
  id: string; key: string; label: string; category: string; body: string; updatedAt: Date;
};

const CATEGORY_LABELS: Record<string, string> = {
  renewal:    "Renewal Reminders",
  winback:    "Win-Back (31–90 days lapsed)",
  upsell:     "PT Upsell",
  onboarding: "Onboarding (Welcome Messages)",
};

const VARIABLE_HINTS: Record<string, string[]> = {
  renewal:    ["{{name}}", "{{date}}"],
  winback:    ["{{name}}"],
  upsell:     ["{{name}}"],
  onboarding: ["{{name}}", "{{memberId}}"],
};

export function WaTemplatesClient({ templates }: { templates: Template[] }) {
  const [bodies, setBodies] = useState<Record<string, string>>(
    Object.fromEntries(templates.map((t) => [t.key, t.body]))
  );
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const categories = ["renewal", "winback", "upsell", "onboarding"];

  function toggleOpen(key: string) {
    setOpen((o) => ({ ...o, [key]: !o[key] }));
  }

  function handleSave(key: string) {
    startTransition(async () => {
      await updateWaTemplate(key, bodies[key]);
      setSaved((s) => ({ ...s, [key]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000);
    });
  }

  function handleReset(key: string) {
    startTransition(async () => {
      await resetWaTemplate(key);
      // re-fetch would be ideal; for now just mark dirty so user knows to reload
      setSaved((s) => ({ ...s, [key]: true }));
      setTimeout(() => { window.location.reload(); }, 800);
    });
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <p className="text-sm" style={{ color: "#6b7280" }}>
        Edit the WhatsApp messages sent when you tap the WhatsApp button on a member. Use{" "}
        <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(249,115,22,0.1)", color: "#fb923c" }}>{"{{name}}"}</code>{" "}
        for the member's name and{" "}
        <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(249,115,22,0.1)", color: "#fb923c" }}>{"{{date}}"}</code>{" "}
        for the expiry date (where applicable).
      </p>

      {categories.map((cat) => {
        const group = templates.filter((t) => t.category === cat);
        if (!group.length) return null;
        return (
          <div key={cat}>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#4b5563" }}>
              {CATEGORY_LABELS[cat] ?? cat}
            </h2>
            <div className="space-y-3">
              {group.map((t) => {
                const isOpen = open[t.key] ?? false;
                const isDirty = bodies[t.key] !== t.body;
                return (
                  <div key={t.key} className="rounded-2xl overflow-hidden"
                    style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {/* Header row */}
                    <button
                      onClick={() => toggleOpen(t.key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg p-1.5" style={{ background: "rgba(37,211,102,0.1)" }}>
                          <MessageSquare className="h-3.5 w-3.5" style={{ color: "#25d366" }} />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{t.label}</p>
                          {!isOpen && (
                            <p className="text-xs mt-0.5 truncate max-w-md" style={{ color: "#4b5563" }}>
                              {bodies[t.key].split("\n")[0].slice(0, 80)}…
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {isDirty && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>unsaved</span>}
                        {isOpen ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                      </div>
                    </button>

                    {/* Expanded editor */}
                    {isOpen && (
                      <div className="px-5 pb-5 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="flex items-center gap-2 pt-3 flex-wrap">
                          <p className="text-[11px] font-bold" style={{ color: "#4b5563" }}>Variables:</p>
                          {(VARIABLE_HINTS[cat] ?? ["{{name}}"]).map((v) => (
                            <code key={v} className="text-[11px] px-2 py-0.5 rounded-md cursor-pointer transition-opacity hover:opacity-70"
                              style={{ background: "rgba(249,115,22,0.1)", color: "#fb923c" }}
                              onClick={() => {
                                const ta = document.getElementById(`ta-${t.key}`) as HTMLTextAreaElement;
                                if (!ta) return;
                                const start = ta.selectionStart; const end = ta.selectionEnd;
                                const next = bodies[t.key].slice(0, start) + v + bodies[t.key].slice(end);
                                setBodies((b) => ({ ...b, [t.key]: next }));
                                setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + v.length; ta.focus(); }, 0);
                              }}>
                              {v}
                            </code>
                          ))}
                        </div>
                        <textarea
                          id={`ta-${t.key}`}
                          rows={6}
                          value={bodies[t.key]}
                          onChange={(e) => setBodies((b) => ({ ...b, [t.key]: e.target.value }))}
                          className="w-full rounded-xl p-4 text-sm text-white resize-y leading-relaxed focus:outline-none transition-all"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            fontFamily: "inherit",
                            minHeight: "120px",
                          }}
                          onFocus={(e) => (e.currentTarget.style.border = "1px solid rgba(249,115,22,0.4)")}
                          onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)")}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSave(t.key)}
                            disabled={isPending || !isDirty}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                            style={{ background: saved[t.key] ? "rgba(16,185,129,0.15)" : "rgba(249,115,22,0.15)", color: saved[t.key] ? "#34d399" : "#fb923c", border: `1px solid ${saved[t.key] ? "rgba(16,185,129,0.3)" : "rgba(249,115,22,0.3)"}` }}
                          >
                            <Save className="h-3.5 w-3.5" />
                            {saved[t.key] ? "Saved!" : "Save"}
                          </button>
                          <button
                            onClick={() => handleReset(t.key)}
                            disabled={isPending}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                            style={{ background: "rgba(255,255,255,0.04)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset to default
                          </button>
                          <p className="text-[10px] ml-auto" style={{ color: "#374151" }}>
                            Last updated: {new Date(t.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
