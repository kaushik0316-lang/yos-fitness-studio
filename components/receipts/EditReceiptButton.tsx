"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toTitleCase } from "@/lib/utils/titleCase";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

type Props = {
  paymentId: string;
  employees: { id: string; fullName: string }[];
  current: {
    memberName: string;
    memberPhone: string;
    date: string;
    amount: number;
    discount: number;
    pendingAmount: number;
    paymentMode: string;
    paymentType: string;
    categoryLabel: string;
    periodLabel: string;
    startDate: string;
    expiryDate: string;
    notes: string;
    transactionRef: string;
    company: string;
    soldById: string | null;
    soldById2: string | null;
    soldByPct: number;
  };
};

type MemberResult = { id: string; fullName: string; memberId: string; phone: string };

const MODES = ["CASH", "UPI", "CARD", "CHEQUE", "BANK_TRANSFER", "FREE"];
const MODE_LABELS: Record<string, string> = {
  CASH: "Cash", UPI: "GPay / UPI", CARD: "Card",
  CHEQUE: "Cheque", BANK_TRANSFER: "Bank Transfer", FREE: "Free",
};
const PAYMENT_TYPES = ["ADMISSION", "RENEWAL", "BALANCE", "UPGRADE"];
const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ADMISSION: "Admission", RENEWAL: "Renewal", BALANCE: "Balance", UPGRADE: "Upgrade",
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

export function EditReceiptButton({ paymentId, employees, current }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...current });

  // Split sale state
  const [soldById, setSoldById] = useState<string | null>(current.soldById);
  const [soldById2, setSoldById2] = useState<string | null>(current.soldById2);
  const [soldByPct, setSoldByPct] = useState<number>(current.soldByPct ?? 100);

  // Member search state
  const [memberQuery, setMemberQuery] = useState(current.memberName);
  const [memberResults, setMemberResults] = useState<MemberResult[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens
  function openModal() {
    setForm({ ...current });
    setMemberQuery(current.memberName);
    setSelectedMemberId(null);
    setMemberResults([]);
    setShowDropdown(false);
    setSoldById(current.soldById);
    setSoldById2(current.soldById2);
    setSoldByPct(current.soldByPct ?? 100);
    setError("");
    setOpen(true);
  }

  // Debounced member search
  function onMemberType(val: string) {
    const tc = toTitleCase(val);
    setMemberQuery(tc);
    val = tc;
    setSelectedMemberId(null); // clear any previous selection
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (val.length < 1) { setMemberResults([]); setShowDropdown(false); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setMemberResults(Array.isArray(data) ? data : []);
        setShowDropdown(true);
      } catch { setMemberResults([]); }
    }, 250);
  }

  function pickMember(m: MemberResult) {
    setMemberQuery(m.fullName);
    setSelectedMemberId(m.id);
    setForm((f) => ({ ...f, memberName: m.fullName, memberPhone: m.phone }));
    setShowDropdown(false);
    setMemberResults([]);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function set(key: keyof typeof form, val: string | number) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        memberName: memberQuery,
        memberPhone: form.memberPhone,
        ...(selectedMemberId ? { newMemberId: selectedMemberId } : {}),
        soldById: soldById ?? null,
        soldById2: soldById2 ?? null,
        soldByPct: soldById2 ? soldByPct : 100,
      };
      const res = await fetch(`/api/payments/${paymentId}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        onClick={openModal}
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

              {/* Member Name — searchable combobox */}
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <label style={LBL}>Member Name</label>
                <input
                  style={INP}
                  value={memberQuery}
                  onChange={(e) => onMemberType(e.target.value)}
                  onFocus={() => { if (memberResults.length > 0) setShowDropdown(true); }}
                  placeholder="Type to search members…"
                  autoComplete="off"
                />
                {selectedMemberId && (
                  <p style={{ fontSize: "11px", color: "#059669", margin: "4px 0 0", fontWeight: 600 }}>
                    ✓ Member selected — payment will be reassigned
                  </p>
                )}
                {showDropdown && memberResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "2px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, marginTop: "4px", overflow: "hidden" }}>
                    {memberResults.map((m) => (
                      <button
                        key={m.id}
                        onMouseDown={() => pickMember(m)}
                        style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid #f3f4f6", cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ed")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{m.fullName}</span>
                        <span style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "monospace" }}>#{m.memberId}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div>
                <label style={LBL}>Phone Number</label>
                <input
                  type="tel"
                  style={INP}
                  value={form.memberPhone}
                  onChange={(e) => set("memberPhone", e.target.value)}
                  placeholder="10-digit mobile number"
                />
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

              {/* Payment mode + Company */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={LBL}>Payment Mode</label>
                  <select style={INP} value={form.paymentMode}
                    onChange={(e) => set("paymentMode", e.target.value)}>
                    {MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Company</label>
                  <select style={INP} value={form.company}
                    onChange={(e) => set("company", e.target.value)}>
                    <option value="YOS_FITNESS">Yos Fitness</option>
                    <option value="YOS_FITNESS_STUDIO">Yos Studio</option>
                  </select>
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label style={LBL}>Payment Type</label>
                <select style={INP} value={form.paymentType}
                  onChange={(e) => set("paymentType", e.target.value)}>
                  {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{PAYMENT_TYPE_LABELS[t]}</option>)}
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

              {/* Who made the sale */}
              {employees.length > 0 && (
                <div style={{ border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p style={{ ...LBL, marginBottom: 0 }}>Who Made the Sale?</p>

                  {/* Primary seller */}
                  <div>
                    <label style={{ ...LBL, fontSize: "10px" }}>Primary Seller</label>
                    <select
                      style={INP}
                      value={soldById ?? ""}
                      onChange={(e) => {
                        setSoldById(e.target.value || null);
                        if (!e.target.value) { setSoldById2(null); setSoldByPct(100); }
                      }}
                    >
                      <option value="">— None —</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{toTitleCase(emp.fullName)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Split section */}
                  {soldById && !soldById2 && (
                    <button
                      type="button"
                      onClick={() => setSoldByPct(80)}
                      style={{ alignSelf: "flex-start", fontSize: "12px", color: "#f97316", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
                    >
                      + Split with someone
                    </button>
                  )}

                  {soldById && soldById2 !== undefined && soldById2 !== null ? (
                    <>
                      {/* Slider */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#374151", fontWeight: 600 }}>
                          <span>{toTitleCase(employees.find(e => e.id === soldById)?.fullName ?? "Primary")} {soldByPct}%</span>
                          <span>{toTitleCase(employees.find(e => e.id === soldById2)?.fullName ?? "Secondary")} {100 - soldByPct}%</span>
                        </div>
                        <input
                          type="range"
                          min={10} max={90} step={5}
                          value={soldByPct}
                          onChange={(e) => setSoldByPct(Number(e.target.value))}
                          style={{ width: "100%" }}
                        />
                      </div>
                      {/* Secondary seller */}
                      <div>
                        <label style={{ ...LBL, fontSize: "10px" }}>Secondary Seller</label>
                        <select
                          style={INP}
                          value={soldById2}
                          onChange={(e) => setSoldById2(e.target.value || null)}
                        >
                          <option value="">— None —</option>
                          {employees.filter(e => e.id !== soldById).map((emp) => (
                            <option key={emp.id} value={emp.id}>{toTitleCase(emp.fullName)}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSoldById2(null); setSoldByPct(100); }}
                        style={{ alignSelf: "flex-start", fontSize: "12px", color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        Remove split
                      </button>
                    </>
                  ) : soldById && soldById2 === null && soldByPct < 100 ? (
                    // User clicked "Split" but hasn't picked secondary yet
                    <div>
                      <label style={{ ...LBL, fontSize: "10px" }}>Secondary Seller</label>
                      <select
                        style={INP}
                        value=""
                        onChange={(e) => setSoldById2(e.target.value || null)}
                      >
                        <option value="">— Pick a person —</option>
                        {employees.filter(e => e.id !== soldById).map((emp) => (
                          <option key={emp.id} value={emp.id}>{toTitleCase(emp.fullName)}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              )}

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
