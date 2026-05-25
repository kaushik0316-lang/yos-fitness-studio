"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toTitleCase } from "@/lib/utils/titleCase";

const HOME = "/staff-dashboard";

type Member = { id: string; memberId: string; fullName: string; phone: string };

const CATEGORIES = ["General Fitness", "Personal Training", "Semi-Private Coaching", "Transformation Package", "Student Package", "HIIT Classes"];
const PERIOD_MONTHS: Record<string, number> = { "1 Month": 1, "3 Months": 3, "6 Months": 6, "12 Months": 12 };

function addMonths(dateStr: string, n: number) {
  const d = new Date(dateStr); d.setMonth(d.getMonth() + n); return d.toISOString().split("T")[0];
}
function todayStr() { return new Date().toISOString().split("T")[0]; }
function parseMonths(s: string) { const m = s.trim().match(/^(\d+)\s*(?:months?|m)?$/i); return m ? parseInt(m[1]) : 0; }

const INP = "w-full rounded-xl px-4 py-3 text-sm font-medium bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors";
const LBL = "block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5";
const MODES = ["CASH", "CARD", "UPI", "CHEQUE"] as const;
type Mode = typeof MODES[number];

export default function StaffNewReceipt() {
  const router = useRouter();
  const [pin, setPin] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNewMember, setIsNewMember] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [company, setCompany] = useState<"YOS_FITNESS" | "YOS_FITNESS_STUDIO">("YOS_FITNESS");
  const [paymentType, setPaymentType] = useState<"ADMISSION" | "RENEWAL" | "BALANCE">("ADMISSION");
  const [category, setCategory] = useState("General Fitness");
  const [period, setPeriod] = useState("1 Month");
  const [startDate, setStartDate] = useState(todayStr());
  const [expiryDate, setExpiryDate] = useState(addMonths(todayStr(), 1));
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [pending, setPending] = useState("");
  const [paymentMode, setPaymentMode] = useState<Mode>("CASH");
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState<Mode>("UPI");
  const [splitAmt1, setSplitAmt1] = useState("");
  const [splitAmt2, setSplitAmt2] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ receiptNumber: number } | null>(null);

  // Guard — must have a PIN session
  useEffect(() => {
    const stored = sessionStorage.getItem("staff_pin");
    if (!stored) { router.replace(HOME); return; }
    setPin(stored);
  }, [router]);

  // Fetch members
  useEffect(() => {
    if (!pin) return;
    const q = memberSearch.length >= 1 ? `&q=${encodeURIComponent(memberSearch)}` : "";
    fetch(`/api/staff/members?pin=${encodeURIComponent(pin)}${q}`)
      .then(r => r.json())
      .then(d => setMembers(d.members ?? []))
      .catch(() => {});
  }, [pin, memberSearch]);

  function handlePeriodChange(p: string) {
    setPeriod(p);
    const n = PERIOD_MONTHS[p] ?? parseMonths(p);
    if (n > 0) setExpiryDate(addMonths(startDate, n));
  }
  function handleStartDateChange(d: string) {
    setStartDate(d);
    const n = PERIOD_MONTHS[period] ?? parseMonths(period);
    if (n > 0) setExpiryDate(addMonths(d, n));
  }

  const totalAmount = splitEnabled
    ? (Number(splitAmt1) || 0) + (Number(splitAmt2) || 0)
    : Number(amount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedMember && !isNewMember) { setError("Please select or enter a member."); return; }
    if (isNewMember && !newName.trim()) { setError("Please enter the member's name."); return; }
    if (totalAmount <= 0) { setError("Please enter a valid amount."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/staff/create-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          memberId: isNewMember ? undefined : selectedMember?.id,
          newMemberName: isNewMember ? newName.trim() : undefined,
          newMemberPhone: isNewMember ? newPhone.trim() : undefined,
          company, paymentType,
          categoryLabel: category,
          periodLabel: period,
          amount: totalAmount,
          discount: Number(discount) || 0,
          pendingAmount: Number(pending) || 0,
          paymentMode: splitEnabled ? paymentMode : paymentMode,
          splitPaymentMode: splitEnabled && splitAmt2 ? splitMode : undefined,
          splitAmount: splitEnabled && splitAmt2 ? Number(splitAmt2) : undefined,
          startDate, expiryDate,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create receipt");
      setSuccess({ receiptNumber: data.receiptNumber });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0a0a0a" }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(34,197,94,0.15)" }}>
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Receipt Created!</h2>
          <p className="text-zinc-500 text-sm mt-2">Payment recorded successfully.</p>
          <div className="mt-6 rounded-2xl p-6 border" style={{ background: "#1c1c1c", borderColor: "#2a2a2a" }}>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Receipt No.</p>
            <p className="text-4xl font-extrabold text-orange-500">#{success.receiptNumber}</p>
          </div>
          <button
            onClick={() => router.replace(HOME)}
            className="mt-6 w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "#1c1c1c" }}>
        <button onClick={() => router.replace(HOME)}
          className="p-2 rounded-xl transition-colors hover:bg-zinc-800 text-zinc-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-white font-extrabold text-base">New Receipt</h1>
          <p className="text-zinc-600 text-xs">Record a member payment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full pb-10">

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm font-medium text-red-400 border border-red-900/50"
            style={{ background: "rgba(239,68,68,0.08)" }}>
            {error}
          </div>
        )}

        {/* Company */}
        <div className="rounded-2xl p-4 border" style={{ background: "#1c1c1c", borderColor: "#2a2a2a" }}>
          <p className={LBL}>Company</p>
          <div className="grid grid-cols-2 gap-2">
            {(["YOS_FITNESS", "YOS_FITNESS_STUDIO"] as const).map(c => (
              <button key={c} type="button" onClick={() => setCompany(c)}
                className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  company === c
                    ? c === "YOS_FITNESS" ? "bg-orange-500 border-orange-500 text-white" : "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}>
                {c === "YOS_FITNESS" ? "Yos Fitness" : "Yos Fitness Studio"}
              </button>
            ))}
          </div>
        </div>

        {/* Member */}
        <div className="rounded-2xl p-4 border" style={{ background: "#1c1c1c", borderColor: "#2a2a2a" }}>
          <p className={LBL}>Member</p>
          {isNewMember ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-400">🆕 New Member</span>
                <button type="button" onClick={() => { setIsNewMember(false); setNewName(""); setNewPhone(""); setMemberSearch(""); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline">← Back to search</button>
              </div>
              <input className={INP} placeholder="Full name *" value={newName}
                onChange={e => setNewName(toTitleCase(e.target.value))} />
              <input className={INP} type="tel" placeholder="Phone number" value={newPhone}
                onChange={e => setNewPhone(e.target.value)} maxLength={12} />
            </div>
          ) : (
            <div className="relative">
              <input className={INP} placeholder="Search by name, ID, or phone…"
                value={memberSearch}
                onChange={e => { setMemberSearch(toTitleCase(e.target.value)); setShowDropdown(true); setSelectedMember(null); }}
                onFocus={() => setShowDropdown(true)}
                autoComplete="off"
              />
              {showDropdown && memberSearch.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border overflow-hidden shadow-xl"
                  style={{ background: "#222", borderColor: "#333" }}>
                  {members.map(m => (
                    <button key={m.id} type="button"
                      onMouseDown={() => { setSelectedMember(m); setMemberSearch(`${m.memberId} — ${toTitleCase(m.fullName)}`); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2.5 border-b hover:bg-zinc-700 transition-colors"
                      style={{ borderColor: "#333" }}>
                      <span className="text-sm font-semibold text-white">{toTitleCase(m.fullName)}</span>
                      <span className="text-xs text-zinc-500 ml-2">{m.memberId}</span>
                    </button>
                  ))}
                  <button type="button" onMouseDown={() => { setIsNewMember(true); setNewName(memberSearch.trim()); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-zinc-700 transition-colors">
                    <span className="text-sm font-bold text-orange-400">+ New Member</span>
                    {memberSearch.trim() && <span className="text-sm text-zinc-500 ml-2">"{memberSearch.trim()}"</span>}
                  </button>
                </div>
              )}
              {selectedMember && (
                <p className="text-xs text-green-400 font-medium mt-2">
                  ✓ {selectedMember.memberId} — {toTitleCase(selectedMember.fullName)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Payment Type */}
        <div className="rounded-2xl p-4 border" style={{ background: "#1c1c1c", borderColor: "#2a2a2a" }}>
          <p className={LBL}>Payment Type</p>
          <div className="grid grid-cols-3 gap-2">
            {(["ADMISSION", "RENEWAL", "BALANCE"] as const).map(t => (
              <button key={t} type="button" onClick={() => setPaymentType(t)}
                className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  paymentType === t
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Category + Period */}
        <div className="rounded-2xl p-4 border space-y-3" style={{ background: "#1c1c1c", borderColor: "#2a2a2a" }}>
          <div>
            <label className={LBL}>Category</label>
            <select className={INP} value={category} onChange={e => setCategory(e.target.value)}
              style={{ colorScheme: "dark" }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={LBL}>Period</label>
            <select className={INP} value={period} onChange={e => handlePeriodChange(e.target.value)}
              style={{ colorScheme: "dark" }}>
              {Object.keys(PERIOD_MONTHS).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Start Date</label>
              <input type="date" className={INP} value={startDate}
                onChange={e => handleStartDateChange(e.target.value)}
                style={{ colorScheme: "dark" }} />
            </div>
            <div>
              <label className={LBL}>Expiry Date</label>
              <input type="date" className={INP} value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                style={{ colorScheme: "dark" }} />
            </div>
          </div>
        </div>

        {/* Payment Details + Mode */}
        <div className="rounded-2xl p-4 border space-y-4" style={{ background: "#1c1c1c", borderColor: "#2a2a2a" }}>
          <div className="flex items-center justify-between">
            <p className={LBL} style={{ marginBottom: 0 }}>Payment Details</p>
            <button type="button"
              onClick={() => { setSplitEnabled(!splitEnabled); setSplitAmt1(""); setSplitAmt2(""); }}
              className="text-[11px] font-bold px-3 py-1 rounded-full border border-zinc-600 text-zinc-400 hover:border-orange-500 hover:text-orange-400 transition-all">
              {splitEnabled ? "✕ Remove split" : "+ Split payment"}
            </button>
          </div>

          {!splitEnabled ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={LBL}>Amount (₹) *</label>
                  <input type="number" className={INP} placeholder="0" min={1} value={amount}
                    onChange={e => setAmount(e.target.value)} style={{ colorScheme: "dark" }} />
                </div>
                <div>
                  <label className={LBL}>Discount (₹)</label>
                  <input type="number" className={INP} placeholder="0" min={0} value={discount}
                    onChange={e => setDiscount(e.target.value)} style={{ colorScheme: "dark" }} />
                </div>
                <div>
                  <label className={LBL}>Pending (₹)</label>
                  <input type="number" className={INP} placeholder="0" min={0} value={pending}
                    onChange={e => setPending(e.target.value)} style={{ colorScheme: "dark" }} />
                </div>
              </div>
              <div>
                <label className={LBL}>Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {MODES.map(m => (
                    <button key={m} type="button" onClick={() => setPaymentMode(m)}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        paymentMode === m
                          ? "bg-orange-500 border-orange-500 text-white"
                          : "bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      }`}>
                      {m === "UPI" ? "GPay/UPI" : m.charAt(0) + m.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {/* Split row 1 */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">1st Payment</p>
                <div className="grid grid-cols-4 gap-2">
                  {MODES.map(m => (
                    <button key={m} type="button" onClick={() => setPaymentMode(m)}
                      className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                        paymentMode === m
                          ? "bg-orange-500 border-orange-500 text-white"
                          : "bg-transparent border-zinc-700 text-zinc-400 hover:border-orange-400"
                      }`}>
                      {m === "UPI" ? "GPay/UPI" : m.charAt(0) + m.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <input type="number" placeholder="₹ Amount" min={1} value={splitAmt1}
                  onChange={e => setSplitAmt1(e.target.value)}
                  className={`${INP} border-orange-800 focus:border-orange-500`} style={{ color: "#fb923c", colorScheme: "dark" }} />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-zinc-800" />
                <span className="text-[10px] font-bold text-zinc-600">+</span>
                <div className="flex-1 border-t border-zinc-800" />
              </div>

              {/* Split row 2 */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">2nd Payment</p>
                <div className="grid grid-cols-4 gap-2">
                  {MODES.map(m => (
                    <button key={m} type="button" onClick={() => setSplitMode(m)}
                      className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                        splitMode === m
                          ? "bg-indigo-500 border-indigo-500 text-white"
                          : "bg-transparent border-zinc-700 text-zinc-400 hover:border-indigo-400"
                      }`}>
                      {m === "UPI" ? "GPay/UPI" : m.charAt(0) + m.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <input type="number" placeholder="₹ Amount" min={1} value={splitAmt2}
                  onChange={e => setSplitAmt2(e.target.value)}
                  className={`${INP} border-indigo-800 focus:border-indigo-500`}
                  style={{ color: "#818cf8", colorScheme: "dark" }} />
              </div>

              {/* Total */}
              {((Number(splitAmt1) > 0) || (Number(splitAmt2) > 0)) && (
                <div className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "#111", border: "1px solid #2a2a2a" }}>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total</span>
                  <span className="text-lg font-extrabold text-white">
                    ₹{totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {/* Discount + Pending */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-800">
                <div>
                  <label className={LBL}>Discount (₹)</label>
                  <input type="number" className={INP} placeholder="0" min={0} value={discount}
                    onChange={e => setDiscount(e.target.value)} style={{ colorScheme: "dark" }} />
                </div>
                <div>
                  <label className={LBL}>Pending (₹)</label>
                  <input type="number" className={INP} placeholder="0" min={0} value={pending}
                    onChange={e => setPending(e.target.value)} style={{ colorScheme: "dark" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-2xl p-4 border" style={{ background: "#1c1c1c", borderColor: "#2a2a2a" }}>
          <label className={LBL}>Notes (optional)</label>
          <input className={INP} placeholder="Any remarks…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
          {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating…</> : "Create Receipt →"}
        </button>

        <button type="button" onClick={() => router.replace(HOME)}
          className="w-full py-3 rounded-2xl font-semibold text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
          Cancel
        </button>
      </form>
    </div>
  );
}
