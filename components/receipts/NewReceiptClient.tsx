"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createReceipt } from "@/lib/actions/receipts";
import { Button } from "@/components/ui/button";

type Member = {
  id: string;
  memberId: string;
  fullName: string;
  phone: string;
  primaryCompany: "YOS_FITNESS" | "YOS_FITNESS_STUDIO";
};

type Props = {
  members: Member[];
  userId: string;
};

const CATEGORIES = [
  "Personal Training",
  "General Fitness",
  "Semi-Private Coaching",
  "Transformation Package",
  "Student Package",
  "HIIT Classes",
];

const PERIODS = ["1 Month", "3 Months", "6 Months", "12 Months"];

const PERIOD_DAYS: Record<string, number> = {
  "1 Month": 30,
  "3 Months": 90,
  "6 Months": 180,
  "12 Months": 365,
};

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function NewReceiptClient({ members }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [company, setCompany] = useState<"YOS_FITNESS" | "YOS_FITNESS_STUDIO">("YOS_FITNESS");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [paymentType, setPaymentType] = useState<"ADMISSION" | "RENEWAL" | "BALANCE">("ADMISSION");
  const [categoryInput, setCategoryInput] = useState("General Fitness");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [periodInput, setPeriodInput] = useState("1 Month");
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [startDate, setStartDate] = useState(todayStr());
  const [expiryDate, setExpiryDate] = useState(addDaysToDate(todayStr(), 30));
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [pendingAmount, setPendingAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD" | "CHEQUE">("CASH");
  const [notes, setNotes] = useState("");
  const [prevReceiptNo, setPrevReceiptNo] = useState("");
  const [prevAmount, setPrevAmount] = useState("");

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members.slice(0, 20);
    const q = memberSearch.toLowerCase();
    return members
      .filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.memberId.toLowerCase().includes(q) ||
          m.phone.includes(q)
      )
      .slice(0, 20);
  }, [members, memberSearch]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  function handleSelectMember(m: Member) {
    setSelectedMemberId(m.id);
    setMemberSearch(`${m.memberId} — ${m.fullName}`);
    setShowMemberDropdown(false);
    // Auto-set company to member's primary company
    setCompany(m.primaryCompany);
  }

  function handlePeriodSelect(p: string) {
    setPeriodInput(p);
    setShowPeriodDropdown(false);
    const days = PERIOD_DAYS[p];
    if (days) {
      setExpiryDate(addDaysToDate(startDate, days));
    }
  }

  function handleStartDateChange(val: string) {
    setStartDate(val);
    const days = PERIOD_DAYS[periodInput];
    if (days) {
      setExpiryDate(addDaysToDate(val, days));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedMemberId) {
      setError("Please select a member.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const result = await createReceipt({
        memberId: selectedMemberId,
        company,
        paymentType,
        categoryLabel: categoryInput,
        periodLabel: periodInput,
        amount: Number(amount),
        discount: Number(discount) || 0,
        pendingAmount: Number(pendingAmount) || 0,
        paymentMode,
        startDate,
        expiryDate,
        previousReceiptNo: prevReceiptNo ? Number(prevReceiptNo) : undefined,
        previousAmount: prevAmount ? Number(prevAmount) : undefined,
        notes: notes || undefined,
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
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
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
        <div className="relative">
          <input
            value={memberSearch}
            onChange={(e) => {
              setMemberSearch(e.target.value);
              setShowMemberDropdown(true);
              if (!e.target.value) setSelectedMemberId("");
            }}
            onFocus={() => setShowMemberDropdown(true)}
            placeholder="Search by name, ID, or phone…"
            className={inputClass}
            autoComplete="off"
          />
          {showMemberDropdown && filteredMembers.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={() => handleSelectMember(m)}
                  className="w-full text-left px-4 py-2.5 hover:bg-orange-50 transition-colors"
                >
                  <span className="font-semibold text-sm text-gray-900">{m.fullName}</span>
                  <span className="text-xs text-gray-400 ml-2">{m.memberId}</span>
                  <span className="text-xs text-gray-400 ml-2">{m.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedMember && (
          <p className="mt-2 text-xs text-emerald-600 font-medium">
            Selected: {selectedMember.memberId} — {selectedMember.fullName} ({selectedMember.phone})
          </p>
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

        {(paymentType === "RENEWAL" || paymentType === "BALANCE") && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Previous Receipt No</label>
              <input
                type="number"
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
                value={prevAmount}
                onChange={(e) => setPrevAmount(e.target.value)}
                placeholder="e.g. 5000"
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Row 4 & 5: Category + Period ── */}
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

          {/* Period combobox */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Period</label>
            <input
              value={periodInput}
              onChange={(e) => {
                setPeriodInput(e.target.value);
                setShowPeriodDropdown(true);
              }}
              onFocus={() => setShowPeriodDropdown(true)}
              onBlur={() => setTimeout(() => setShowPeriodDropdown(false), 150)}
              placeholder="e.g. 3 Months"
              className={inputClass}
              autoComplete="off"
            />
            {showPeriodDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg">
                {PERIODS.filter((p) =>
                  p.toLowerCase().includes(periodInput.toLowerCase())
                ).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onMouseDown={() => handlePeriodSelect(p)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 transition-colors font-medium text-gray-700"
                  >
                    {p}
                  </button>
                ))}
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

      {/* ── Row 7: Amounts ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Details</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount (₹) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min={1}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Discount (₹)</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
              min={0}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Balance / Pending (₹)</label>
            <input
              type="number"
              value={pendingAmount}
              onChange={(e) => setPendingAmount(e.target.value)}
              placeholder="0"
              min={0}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Row 8: Payment Mode ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Mode</p>
        <div className="grid grid-cols-4 gap-3">
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

      {/* ── Row 9: Notes ── */}
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
