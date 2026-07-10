"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createReceipt } from "@/lib/actions/receipts";
import { toTitleCase } from "@/lib/utils/titleCase";
import { Button } from "@/components/ui/button";

type Member = {
  id: string;
  memberId: string;
  fullName: string;
  phone: string;
};

type Employee = {
  id: string;
  fullName: string;
  role: string;
  employeeId: string;
};

type Props = {
  members: Member[];
  employees: Employee[];
  userId: string;
  initialMemberId?: string;
  initialPaymentType?: "ADMISSION" | "RENEWAL" | "BALANCE";
};

const CATEGORIES = [
  "Personal Training",
  "General Fitness",
  "Semi-Private Coaching",
  "Transformation Package",
  "Student Package",
  "HIIT Classes",
];

const PERIOD_PRESETS = ["1 Month", "3 Months", "6 Months", "12 Months"];
const PERIOD_PRESET_MONTHS: Record<string, number> = {
  "1 Month": 1, "3 Months": 3, "6 Months": 6, "12 Months": 12,
};

/** Parse "4 Months", "4 months", "4", "4M" → 4. Returns 0 if unrecognisable. */
function parseMonths(period: string): number {
  const s = period.trim();
  const m = s.match(/^(\d+)\s*(?:months?|m)?$/i);
  if (m) return parseInt(m[1], 10);
  return 0;
}

function addMonthsToDate(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1); // expiry = last day of period (e.g. 20 May + 1M = 19 Jun)
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function NewReceiptClient({ members, employees, initialMemberId, initialPaymentType }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [company, setCompany] = useState<"YOS_FITNESS" | "YOS_FITNESS_STUDIO">("YOS_FITNESS");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [paymentType, setPaymentType] = useState<"ADMISSION" | "RENEWAL" | "BALANCE">(initialPaymentType ?? "ADMISSION");

  // Pre-fill member if initialMemberId was passed via URL
  useEffect(() => {
    if (!initialMemberId) return;
    const member = members.find((m) => m.id === initialMemberId);
    if (member) {
      setSelectedMemberId(member.id);
      setMemberSearch(`${member.memberId} — ${toTitleCase(member.fullName)}`);
    }
  }, [initialMemberId, members]);

  // Auto-fill from latest payment when member is selected
  useEffect(() => {
    if (!selectedMemberId) return;
    fetch(`/api/members/${selectedMemberId}/latest-payment`)
      .then((r) => r.json())
      .then((p) => {
        if (p.error) return;
        // Always fill previous receipt info
        if (p.receiptNumber) setPrevReceiptNo(String(p.receiptNumber));
        if (p.amount) setPrevAmount(String(Math.round(Number(p.amount))));
        // Fill category and period
        if (p.categoryLabel) setCategoryInput(p.categoryLabel);
        if (p.periodLabel) setPeriodInput(p.periodLabel);
        // Fill company
        if (p.company) setCompany(p.company);
        // For BALANCE: fill amount from pending, keep same dates
        if (paymentType === "BALANCE") {
          if (p.pendingAmount && Number(p.pendingAmount) > 0)
            setAmount(String(Math.round(Number(p.pendingAmount))));
          if (p.startDate) setStartDate(p.startDate.slice(0, 10));
          if (p.expiryDate) setExpiryDate(p.expiryDate.slice(0, 10));
        }
        // For RENEWAL: start from day after expiry
        if (paymentType === "RENEWAL") {
          if (p.expiryDate) {
            const nextDay = new Date(p.expiryDate);
            nextDay.setDate(nextDay.getDate() + 1);
            setStartDate(nextDay.toISOString().slice(0, 10));
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId, paymentType]);
  const [categoryInput, setCategoryInput] = useState("General Fitness");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [periodInput, setPeriodInput] = useState("1 Month");
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [billDate, setBillDate] = useState(todayStr());
  const [startDate, setStartDate] = useState(todayStr());
  const [expiryDate, setExpiryDate] = useState(addMonthsToDate(todayStr(), 1));
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [pendingAmount, setPendingAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD" | "CHEQUE">("CASH");
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState<"CASH" | "UPI" | "CARD" | "CHEQUE">("UPI");
  const [splitAmt, setSplitAmt] = useState("");   // 2nd payment amount
  const [splitAmt1, setSplitAmt1] = useState(""); // 1st payment amount (split mode only)
  const [notes, setNotes] = useState("");
  const [prevReceiptNo, setPrevReceiptNo] = useState("");
  const [prevAmount, setPrevAmount] = useState("");
  const [soldById, setSoldById]   = useState<string | null>(null);
  const [soldById2, setSoldById2] = useState<string | null>(null);
  const [soldByPct, setSoldByPct] = useState(80); // % for primary; (100-pct) to secondary
  const [phoneOverride, setPhoneOverride] = useState(""); // used when member has no phone saved
  const [isNewMember, setIsNewMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [cardChargePct, setCardChargePct] = useState("");
  const [cardChargeAmt, setCardChargeAmt] = useState("");

  // Token search: split by spaces so "m vishal" matches "Vishal M" in any order
  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members.slice(0, 20);
    const tokens = memberSearch.toLowerCase().split(/\s+/).filter(Boolean);
    return members
      .filter((m) =>
        tokens.every((t) =>
          m.fullName.toLowerCase().includes(t) ||
          m.memberId.toLowerCase().includes(t) ||
          m.phone.includes(t)
        )
      )
      .slice(0, 20);
  }, [members, memberSearch]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Card charge helpers
  const showCardCharge =
    (!splitEnabled && paymentMode === "CARD") ||
    (splitEnabled && (paymentMode === "CARD" || splitMode === "CARD"));

  const cardLeg = (() => {
    if (!splitEnabled && paymentMode === "CARD") {
      return Math.max(0, (Number(amount) || 0) - (Number(discount) || 0));
    }
    if (splitEnabled) {
      let leg = 0;
      if (paymentMode === "CARD") leg += Number(splitAmt1) || 0;
      if (splitMode === "CARD") leg += Number(splitAmt) || 0;
      return leg;
    }
    return 0;
  })();

  // Reset card charge when card is no longer involved
  useEffect(() => {
    if (!showCardCharge) {
      setCardChargePct("");
      setCardChargeAmt("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitEnabled, paymentMode, splitMode]);

  // Recalculate flat amount when pct or card-leg amounts change
  useEffect(() => {
    const pct = parseFloat(cardChargePct);
    if (!pct || pct <= 0) return;
    let leg = 0;
    if (!splitEnabled && paymentMode === "CARD") {
      leg = Math.max(0, (Number(amount) || 0) - (Number(discount) || 0));
    } else if (splitEnabled) {
      if (paymentMode === "CARD") leg += Number(splitAmt1) || 0;
      if (splitMode === "CARD") leg += Number(splitAmt) || 0;
    }
    if (leg > 0) setCardChargeAmt(String(Math.round(leg * pct / 100)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardChargePct, amount, discount, splitAmt, splitAmt1, splitEnabled, paymentMode, splitMode]);

  function isFakePhone(p: string) {
    const d = p.replace(/\D/g, "");
    return !d || d.length < 9 || new Set(d.split("")).size === 1;
  }

  function handleSelectMember(m: Member) {
    setSelectedMemberId(m.id);
    setMemberSearch(`${m.memberId} — ${m.fullName}`);
    setShowMemberDropdown(false);
    setPhoneOverride("");
    setIsNewMember(false);
    setNewMemberName("");
    setNewMemberPhone("");
  }

  function handleNewMember() {
    setIsNewMember(true);
    setNewMemberName(memberSearch.trim());
    setSelectedMemberId("");
    setShowMemberDropdown(false);
  }

  function cancelNewMember() {
    setIsNewMember(false);
    setNewMemberName("");
    setNewMemberPhone("");
    setMemberSearch("");
  }

  function handlePeriodSelect(p: string) {
    setPeriodInput(p);
    setShowPeriodDropdown(false);
    const months = PERIOD_PRESET_MONTHS[p] ?? parseMonths(p);
    if (months > 0) setExpiryDate(addMonthsToDate(startDate, months));
  }

  function handlePeriodInputChange(val: string) {
    setPeriodInput(val);
    const months = PERIOD_PRESET_MONTHS[val] ?? parseMonths(val);
    if (months > 0) setExpiryDate(addMonthsToDate(startDate, months));
  }

  function handleStartDateChange(val: string) {
    setStartDate(val);
    const months = PERIOD_PRESET_MONTHS[periodInput] ?? parseMonths(periodInput);
    if (months > 0) setExpiryDate(addMonthsToDate(val, months));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedMemberId && !isNewMember) {
      setError("Please select a member or create a new one.");
      return;
    }
    if (isNewMember && !newMemberName.trim()) {
      setError("Please enter the new member's name.");
      return;
    }
    const totalAmt = splitEnabled
      ? (Number(splitAmt1) || 0) + (Number(splitAmt) || 0)
      : Number(amount);
    if (totalAmt <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const result = await createReceipt({
        memberId: isNewMember ? undefined : selectedMemberId,
        newMemberName: isNewMember ? newMemberName.trim() : undefined,
        newMemberPhone: isNewMember ? newMemberPhone.trim() : undefined,
        company,
        paymentType,
        categoryLabel: categoryInput,
        periodLabel: periodInput,
        amount: splitEnabled ? (Number(splitAmt1) || 0) + (Number(splitAmt) || 0) : Number(amount),
        discount: Number(discount) || 0,
        pendingAmount: Number(pendingAmount) || 0,
        paymentMode,
        splitPaymentMode: splitEnabled && splitAmt ? splitMode : undefined,
        splitAmount: splitEnabled && splitAmt ? Number(splitAmt) : undefined,
        cardCharge: showCardCharge ? (Number(cardChargeAmt) || 0) : 0,
        billDate,
        startDate,
        expiryDate,
        previousReceiptNo: prevReceiptNo ? Number(prevReceiptNo) : undefined,
        previousAmount: prevAmount ? Number(prevAmount) : undefined,
        notes: notes || undefined,
        soldById:  soldById  ?? undefined,
        soldById2: soldById && soldById2 ? soldById2 : undefined,
        soldByPct: soldById && soldById2 ? soldByPct : undefined,
        phoneOverride: phoneOverride || undefined,
      });
      router.push(`/payments/${result.paymentId}/receipt`);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-white text-gray-800 font-medium placeholder-gray-400";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6" style={{ colorScheme: "light" }} data-receipt-form>
      <style>{`
        [data-receipt-form] input,
        [data-receipt-form] select,
        [data-receipt-form] textarea {
          color: #111827 !important;
          background-color: #ffffff !important;
          -webkit-text-fill-color: #111827 !important;
        }
        [data-receipt-form] input::placeholder {
          color: #9ca3af !important;
          -webkit-text-fill-color: #9ca3af !important;
        }
      `}</style>
      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Row 1: Company ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Company</p>
        <div className="grid grid-cols-2 gap-3">
          {(["YOS_FITNESS", "YOS_FITNESS_STUDIO"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCompany(c)}
              className={`py-3 px-4 rounded-xl text-sm font-bold transition-all border-2 ${
                company === c
                  ? c === "YOS_FITNESS"
                    ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200"
                    : "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {c === "YOS_FITNESS" ? "Yos Fitness" : "Yos Fitness Studio"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 2: Member ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Member</p>

        {isNewMember ? (
          /* ── New member form ── */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">🆕 New Member</span>
              <button type="button" onClick={cancelNewMember} className="text-xs text-gray-400 hover:text-gray-600 underline">
                ← Back to search
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name *</label>
              <input
                value={newMemberName}
                onChange={(e) => setNewMemberName(toTitleCase(e.target.value))}
                placeholder="Enter full name"
                className={inputClass}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">📱 Phone Number</label>
              <input
                type="tel"
                value={newMemberPhone}
                onChange={(e) => setNewMemberPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className={inputClass}
                maxLength={12}
              />
            </div>
          </div>
        ) : (
          /* ── Existing member search ── */
          <div className="relative">
            <input
              value={memberSearch}
              onChange={(e) => {
                const v = toTitleCase(e.target.value);
                setMemberSearch(v);
                setShowMemberDropdown(true);
                if (!e.target.value) setSelectedMemberId("");
              }}
              onFocus={() => setShowMemberDropdown(true)}
              placeholder="Search by name, ID, or phone…"
              className={inputClass}
              autoComplete="off"
            />
            {showMemberDropdown && (memberSearch.length > 0) && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                {filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={() => handleSelectMember(m)}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <p className="font-bold text-sm text-gray-900 leading-tight">{toTitleCase(m.fullName)}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">
                      {m.memberId}
                      <span className="text-gray-300 mx-1.5">·</span>
                      <span className="text-gray-500 font-sans">📱 {m.phone}</span>
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={handleNewMember}
                  className="w-full text-left px-4 py-2.5 hover:bg-orange-50 transition-colors border-t border-orange-100 flex items-center gap-2"
                >
                  <span className="text-sm font-bold text-orange-500">+ New Member</span>
                  {memberSearch.trim() && (
                    <span className="text-sm text-gray-500">"{memberSearch.trim()}"</span>
                  )}
                </button>
              </div>
            )}
            {selectedMember && (
              <div className="mt-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">✓ Member confirmed</p>
                    <p className="font-bold text-gray-900 text-sm">{toTitleCase(selectedMember.fullName)}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      {selectedMember.memberId}
                      <span className="text-gray-300 mx-1.5">·</span>
                      <span className="text-gray-500 font-sans">📱 {selectedMember.phone}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedMemberId(""); setMemberSearch(""); }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors mt-0.5"
                  >
                    ✕ Change
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    📱 Phone Number {isFakePhone(selectedMember.phone) ? <span className="text-orange-500">(none on record)</span> : ""}
                  </label>
                  <input
                    type="tel"
                    value={phoneOverride || (!isFakePhone(selectedMember.phone) ? selectedMember.phone : "")}
                    onChange={(e) => setPhoneOverride(e.target.value)}
                    placeholder="10-digit mobile number"
                    className={inputClass}
                    maxLength={12}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Row 3: Payment Type ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Type</p>
        <div className="grid grid-cols-3 gap-3">
          {(["ADMISSION", "RENEWAL", "BALANCE"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPaymentType(t)}
              className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all border-2 ${
                paymentType === t
                  ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200"
                  : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"
              }`}
            >
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {paymentType === "BALANCE" && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Previous Receipt No</label>
              <input
                type="number"
                inputMode="numeric"
                value={prevReceiptNo}
                onChange={(e) => setPrevReceiptNo(e.target.value)}
                placeholder="e.g. 142"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Previous Amount (₹)</label>
              <input
                type="number"
                inputMode="numeric"
                value={prevAmount}
                onChange={(e) => setPrevAmount(e.target.value)}
                placeholder="e.g. 5000"
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Row 4: Bill Date ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Bill Date</p>
        <input
          type="date"
          value={billDate}
          onChange={(e) => setBillDate(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-gray-400 mt-1.5">Defaults to today — change only if backdating a receipt</p>
      </div>

      {/* ── Row 5: Category + Period ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category combobox */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
            <input
              value={categoryInput}
              onChange={(e) => { setCategoryInput(e.target.value); setShowCategoryDropdown(true); }}
              onFocus={() => setShowCategoryDropdown(true)}
              onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 150)}
              placeholder="e.g. Personal Training"
              className={inputClass}
              autoComplete="off"
            />
            {showCategoryDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg">
                {CATEGORIES.filter((c) =>
                  c.toLowerCase().includes(categoryInput.toLowerCase())
                ).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={() => { setCategoryInput(c); setShowCategoryDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 transition-colors font-medium text-gray-700"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Period — preset dropdown + free type */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Period</label>
            <input
              value={periodInput}
              onChange={(e) => { handlePeriodInputChange(e.target.value); setShowPeriodDropdown(true); }}
              onFocus={() => setShowPeriodDropdown(true)}
              onBlur={() => setTimeout(() => setShowPeriodDropdown(false), 150)}
              placeholder="e.g. 4 Months"
              className={inputClass}
              autoComplete="off"
            />
            {showPeriodDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Common packages</p>
                {PERIOD_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onMouseDown={() => handlePeriodSelect(p)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 transition-colors font-medium text-gray-700"
                  >
                    {p}
                  </button>
                ))}
                <p className="px-4 pt-1 pb-2.5 text-[10px] text-gray-400">Or type any duration e.g. "4 Months"</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 6: Start + Expiry Date ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Membership Period</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Starting Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Row 7: Payment Details + Mode ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payment Details</p>
          <button
            type="button"
            onClick={() => { setSplitEnabled(!splitEnabled); setSplitAmt(""); setSplitAmt1(""); }}
            className="text-xs font-bold px-3 py-1 rounded-full border-2 border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-all bg-white"
          >
            {splitEnabled ? "✕ Remove split" : "+ Split payment"}
          </button>
        </div>

        {!splitEnabled ? (
          /* ── Single payment ── */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount (₹) *</label>
              <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0" min={1} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Discount (₹)</label>
              <input type="number" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)}
                placeholder="0" min={0} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Balance / Pending (₹)</label>
              <input type="number" inputMode="numeric" value={pendingAmount} onChange={(e) => setPendingAmount(e.target.value)}
                placeholder="0" min={0} className={inputClass} />
            </div>
          </div>
        ) : (
          /* ── Split payment ── */
          <div className="space-y-3">
            {/* Row 1 — primary */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(["CASH", "CARD", "UPI", "CHEQUE"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setPaymentMode(mode)}
                    className={`py-2 px-1 rounded-lg text-xs font-bold border-2 transition-all ${
                      paymentMode === mode
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"
                    }`}>
                    {mode === "UPI" ? "GPay/UPI" : mode.charAt(0) + mode.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={splitAmt1}
                onChange={(e) => setSplitAmt1(e.target.value)}
                placeholder="₹ Amount"
                min={1}
                className={`${inputClass} text-orange-600 font-bold border-orange-200 focus:border-orange-400`}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-gray-100" />
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">+</span>
              <div className="flex-1 border-t border-gray-100" />
            </div>

            {/* Row 2 — split */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(["CASH", "CARD", "UPI", "CHEQUE"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setSplitMode(mode)}
                    className={`py-2 px-1 rounded-lg text-xs font-bold border-2 transition-all ${
                      splitMode === mode
                        ? "bg-indigo-500 border-indigo-500 text-white"
                        : "bg-white border-gray-200 text-gray-500 hover:border-indigo-300"
                    }`}>
                    {mode === "UPI" ? "GPay/UPI" : mode.charAt(0) + mode.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={splitAmt}
                onChange={(e) => setSplitAmt(e.target.value)}
                placeholder="₹ Amount"
                min={1}
                className={`${inputClass} font-bold border-indigo-200 focus:border-indigo-400`}
                style={{ color: "#4338ca" }}
              />
            </div>

            {/* Auto-computed total */}
            {(Number(splitAmt1) > 0 || Number(splitAmt) > 0) && (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Total</span>
                <span className="text-base font-extrabold text-gray-800">
                  ₹{((Number(splitAmt1) || 0) + (Number(splitAmt) || 0)).toLocaleString("en-IN")}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-gray-100">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Discount (₹)</label>
                <input type="number" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0" min={0} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Balance / Pending (₹)</label>
                <input type="number" inputMode="numeric" value={pendingAmount} onChange={(e) => setPendingAmount(e.target.value)}
                  placeholder="0" min={0} className={inputClass} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Row 8: Payment Mode (hidden when split is active) ── */}
      {!splitEnabled && (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Mode</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["CASH", "CARD", "UPI", "CHEQUE"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPaymentMode(mode)}
              className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all border-2 ${
                paymentMode === mode
                  ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200"
                  : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"
              }`}
            >
              {mode === "UPI" ? "GPay/UPI" : mode.charAt(0) + mode.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* ── Card Charge (shown only when Card is the payment mode or a split leg) ── */}
      {showCardCharge && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Card Charge</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Charge %</label>
              <input
                type="number"
                inputMode="decimal"
                value={cardChargePct}
                onChange={(e) => setCardChargePct(e.target.value)}
                placeholder="e.g. 2"
                min={0}
                max={10}
                step={0.1}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Charge ₹</label>
              <input
                type="number"
                inputMode="numeric"
                value={cardChargeAmt}
                onChange={(e) => setCardChargeAmt(e.target.value)}
                placeholder="0"
                min={0}
                className={inputClass}
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            {cardLeg > 0
              ? `Applied to ₹${cardLeg.toLocaleString("en-IN")} (card amount) · enter % to auto-calculate, or type ₹ directly`
              : "Enter card amount above first"}
          </p>
        </div>
      )}

      {/* ── Row 9: Who made the sale? (admin only — not on receipt) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Who Made the Sale?</p>
          <span className="text-[10px] font-semibold text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">
            INTERNAL · NOT ON RECEIPT
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Common / unattributed */}
          <button
            type="button"
            onClick={() => setSoldById(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
              soldById === null
                ? "bg-gray-700 border-gray-700 text-white"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
            }`}
          >
            Common Sale
          </button>
          {employees.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => setSoldById(emp.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                soldById === emp.id
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"
              }`}
            >
              {emp.fullName}
            </button>
          ))}
        </div>
        {soldById === null && (
          <p className="text-[11px] text-gray-400 mt-2">Not attributed to a specific staff member</p>
        )}

        {/* Split sale — shown when a primary seller is selected */}
        {soldById && (
          <div className="mt-3 space-y-2">
            {/* Split toggle */}
            {!soldById2 ? (
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-orange-600 font-semibold">
                  ✓ {employees.find((e) => e.id === soldById)?.fullName} · 100%
                </p>
                <button
                  type="button"
                  onClick={() => setSoldById2("")}
                  className="text-[11px] font-semibold text-gray-400 hover:text-orange-500 transition-colors underline underline-offset-2"
                >
                  + Split with someone
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-orange-600 uppercase tracking-widest">Split Sale</p>
                  <button
                    type="button"
                    onClick={() => { setSoldById2(null); setSoldByPct(80); }}
                    className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Remove split
                  </button>
                </div>

                {/* Percentage slider */}
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[80px]">
                    <p className="text-xs font-bold text-orange-600">{soldByPct}%</p>
                    <p className="text-[10px] text-gray-500 truncate max-w-[80px]">{employees.find((e) => e.id === soldById)?.fullName}</p>
                  </div>
                  <input
                    type="range" min={10} max={90} step={5}
                    value={soldByPct}
                    onChange={(e) => setSoldByPct(Number(e.target.value))}
                    className="flex-1 accent-orange-500"
                  />
                  <div className="text-center min-w-[80px]">
                    <p className="text-xs font-bold text-orange-400">{100 - soldByPct}%</p>
                    <p className="text-[10px] text-gray-500 truncate max-w-[80px]">
                      {soldById2 ? employees.find((e) => e.id === soldById2)?.fullName : "2nd person"}
                    </p>
                  </div>
                </div>

                {/* Second person selector */}
                <div className="flex flex-wrap gap-1.5">
                  {employees.filter((e) => e.id !== soldById).map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSoldById2(emp.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
                        soldById2 === emp.id
                          ? "bg-orange-400 border-orange-400 text-white"
                          : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"
                      }`}
                    >
                      {emp.fullName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Row 10: Notes ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Notes (optional)</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any remarks…"
          className={inputClass}
        />
      </div>

      {/* ── Submit ── */}
      <div className="flex items-center gap-3 pb-6">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-200 text-sm transition-colors"
        >
          {loading ? "Creating Receipt…" : "Create Receipt & Print"}
        </Button>
        <button
          type="button"
          onClick={() => router.push("/payments")}
          className="px-5 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
