"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, RotateCcw, Receipt, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { renewMembership } from "@/lib/actions/members";
import { toast } from "@/hooks/use-toast";
import { format, addDays, addMonths } from "date-fns";
import { Company, PaymentMode } from "@prisma/client";

type Trainer = { id: string; fullName: string };

type Props = {
  open: boolean;
  onClose: () => void;
  member: { id: string; memberId: string; fullName: string };
  packages: { id: string; name: string; price: any; durationDays: number; company: Company | null }[];
  userId: string;
  userRole?: string;
  trainers?: Trainer[];
};

const PAYMENT_MODES = ["CASH", "UPI", "CARD", "CHEQUE", "BANK_TRANSFER", "FREE"] as const;

const CATEGORIES = [
  "Personal Training",
  "General Fitness",
  "Semi-Private Coaching",
  "Transformation Package",
  "Student Package",
  "HIIT Classes",
];

const PERIOD_PRESETS = ["2 Weeks", "1 Month", "3 Months", "6 Months", "12 Months"];
const PERIOD_PRESET_MONTHS: Record<string, number> = {
  "1 Month": 1, "3 Months": 3, "6 Months": 6, "12 Months": 12,
};
const PERIOD_PRESET_DAYS: Record<string, number> = { "2 Weeks": 14 };

function computeExpiry(startStr: string, period: string): { expiryStr: string; durationDays: number } {
  const start = new Date(startStr);
  const months = PERIOD_PRESET_MONTHS[period];
  const days = PERIOD_PRESET_DAYS[period];
  let expiry: Date;
  if (months) {
    expiry = addMonths(start, months);
    expiry = addDays(expiry, -1);
  } else if (days) {
    expiry = addDays(start, days - 1);
  } else {
    expiry = addDays(start, 29);
  }
  const durationDays = Math.round((expiry.getTime() - start.getTime()) / 86400000) + 1;
  return { expiryStr: format(expiry, "yyyy-MM-dd"), durationDays };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function RenewMembershipDialog({ open, onClose, member, packages, userId, userRole, trainers = [] }: Props) {
  const [loading, setLoading] = useState(false);
  const [successPaymentId, setSuccessPaymentId] = useState<string | null>(null);
  const [successExpiry, setSuccessExpiry] = useState<Date | null>(null);

  // Split payment state
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState<typeof PAYMENT_MODES[number]>("UPI");
  const [splitAmt, setSplitAmt] = useState("");
  const [splitAmt1, setSplitAmt1] = useState("");

  // Card charge state
  const [cardChargePct, setCardChargePct] = useState("");
  const [cardChargeAmt, setCardChargeAmt] = useState("");

  // Who Made the Sale?
  const [soldById, setSoldById] = useState<string | null>(null);
  const [soldById2, setSoldById2] = useState<string | null>(null);
  const [soldByPct, setSoldByPct] = useState(80);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      packageId: "",
      billDate: todayStr(),
      startDate: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      discount: "0",
      pendingAmount: "0",
      paymentMode: "CASH" as typeof PAYMENT_MODES[number],
      company: "YOS_FITNESS" as Company,
      paymentType: "RENEWAL",
      previousReceiptNo: "",
      transactionRef: "",
      notes: "",
      commissionTrainerId: "",
      commissionPct: "",
    },
  });

  const [categoryInput, setCategoryInput] = useState("General Fitness");
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [period, setPeriod] = useState("1 Month");

  const selectedPackageId = watch("packageId");
  const selectedPkg = packages.find((p) => p.id === selectedPackageId);
  const paymentMode = watch("paymentMode");
  const paymentType = watch("paymentType");
  const amount = watch("amount");
  const discount = watch("discount");

  const commissionTrainerId = watch("commissionTrainerId");
  const commissionPct = parseFloat(watch("commissionPct") ?? "") || 0;
  const amountVal = parseFloat(amount ?? "") || 0;
  const commissionPreview = amountVal && commissionPct ? Math.round(amountVal * commissionPct) / 100 : 0;

  // Card charge logic
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

  useEffect(() => {
    if (!showCardCharge) { setCardChargePct(""); setCardChargeAmt(""); }
  }, [showCardCharge]);

  useEffect(() => {
    const pct = parseFloat(cardChargePct);
    if (!pct || cardLeg <= 0) return;
    setCardChargeAmt(String(Math.round(cardLeg * pct / 100)));
  }, [cardChargePct, cardLeg]);

  const startDateVal = watch("startDate");
  const { expiryStr: previewExpiryStr, durationDays: previewDurationDays } = startDateVal && period
    ? computeExpiry(startDateVal, period)
    : { expiryStr: "", durationDays: 0 };

  function handleClose() {
    reset();
    setSplitEnabled(false); setSplitAmt(""); setSplitAmt1(""); setSplitMode("UPI");
    setCardChargePct(""); setCardChargeAmt("");
    setSoldById(null); setSoldById2(null); setSoldByPct(80);
    setCategoryInput("General Fitness"); setPeriod("1 Month");
    setSuccessPaymentId(null); setSuccessExpiry(null);
    onClose();
  }

  async function onSubmit(data: any) {
    if (!categoryInput.trim()) {
      toast({ title: "Select a category", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const totalAmt = splitEnabled
        ? (Number(splitAmt1) || 0) + (Number(splitAmt) || 0)
        : Number(data.amount) || 0;

      const { expiryStr, durationDays } = computeExpiry(data.startDate, period);

      const result = await renewMembership({
        memberId: member.id,
        categoryLabel: categoryInput.trim(),
        periodLabel: period,
        durationDays,
        expiryDate: expiryStr,
        startDate: data.startDate,
        amount: totalAmt,
        discount: Number(data.discount) || 0,
        paymentMode: data.paymentMode as PaymentMode,
        company: data.company as Company,
        notes: data.notes || undefined,
        commissionTrainerId: data.commissionTrainerId || undefined,
        commissionPct: data.commissionPct ? Number(data.commissionPct) : undefined,
        memberName: member.fullName,
        packageName: categoryInput.trim(),
        billDate: data.billDate || undefined,
        pendingAmount: Number(data.pendingAmount) || 0,
        splitPaymentMode: splitEnabled && splitAmt ? data.paymentMode !== splitMode ? splitMode as PaymentMode : undefined : undefined,
        splitAmount: splitEnabled && splitAmt ? Number(splitAmt) : undefined,
        cardCharge: showCardCharge ? (Number(cardChargeAmt) || 0) : undefined,
        soldById: soldById ?? undefined,
        soldById2: soldById && soldById2 ? soldById2 : undefined,
        soldByPct: soldById && soldById2 ? soldByPct : undefined,
        transactionRef: data.transactionRef || undefined,
        paymentType: data.paymentType || undefined,
        previousReceiptNo: data.previousReceiptNo ? Number(data.previousReceiptNo) : undefined,
      });
      setSuccessPaymentId(result.paymentId);
      setSuccessExpiry(result.expiryDate!);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none";
  const modeBtnCls = (active: boolean, color = "orange") =>
    `py-2 px-2 rounded-lg text-xs font-bold border-2 transition-all ${
      active
        ? color === "indigo"
          ? "bg-indigo-500 border-indigo-500 text-white"
          : "bg-orange-500 border-orange-500 text-white"
        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
    }`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-orange-500" />
            Renew Membership
          </DialogTitle>
        </DialogHeader>

        {/* ── Success state ── */}
        {successPaymentId && (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Membership Renewed!</p>
              <p className="text-sm text-gray-500 mt-1">
                {member.fullName} · valid till{" "}
                <span className="font-semibold text-emerald-600">
                  {successExpiry ? format(successExpiry, "dd MMM yyyy") : "—"}
                </span>
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Link
                href={`/payments/${successPaymentId}/receipt`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-orange-200"
                onClick={handleClose}
              >
                <Receipt className="h-4 w-4" />
                View Receipt
              </Link>
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {!successPaymentId && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Member */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-900">{member.fullName}</p>
              <p className="text-xs text-gray-400">{member.memberId}</p>
            </div>

            {/* Category */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
              <input
                value={categoryInput}
                onChange={(e) => { setCategoryInput(e.target.value); setShowCatDropdown(true); }}
                onFocus={() => setShowCatDropdown(true)}
                onBlur={() => setTimeout(() => setShowCatDropdown(false), 150)}
                placeholder="e.g. Personal Training"
                className={inputCls}
              />
              {showCatDropdown && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {CATEGORIES.filter(c => c.toLowerCase().includes(categoryInput.toLowerCase())).map(c => (
                    <button key={c} type="button"
                      onMouseDown={() => { setCategoryInput(c); setShowCatDropdown(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Period */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Period</label>
              <div className="flex gap-2 flex-wrap">
                {PERIOD_PRESETS.map(p => (
                  <button key={p} type="button"
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                      period === p ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Bill Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bill Date</label>
              <input {...register("billDate")} type="date" className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Defaults to today — change only if backdating</p>
            </div>

            {/* Start + Expiry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input {...register("startDate")} type="date" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expiry (preview)</label>
                <input
                  readOnly
                  value={previewExpiryStr ? format(new Date(previewExpiryStr), "dd MMM yyyy") : "—"}
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500"
                />
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600">Payment Details</label>
                <button
                  type="button"
                  onClick={() => { setSplitEnabled(!splitEnabled); setSplitAmt(""); setSplitAmt1(""); }}
                  className="text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-all"
                >
                  {splitEnabled ? "✕ Remove split" : "+ Split payment"}
                </button>
              </div>

              {!splitEnabled ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                    <input
                      {...register("amount")}
                      type="number"
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Discount (₹)</label>
                    <input {...register("discount")} type="number" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Pending (₹)</label>
                    <input {...register("pendingAmount")} type="number" defaultValue={0} className={inputCls} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Primary */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["CASH", "CARD", "UPI", "CHEQUE"] as const).map((m) => (
                        <button key={m} type="button"
                          onClick={() => setValue("paymentMode", m)}
                          className={modeBtnCls(paymentMode === m)}>
                          {m === "UPI" ? "GPay/UPI" : m.charAt(0) + m.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number" value={splitAmt1} onChange={(e) => setSplitAmt1(e.target.value)}
                      placeholder="₹ Amount" className={`${inputCls} text-orange-600 font-bold border-orange-200 focus:border-orange-400`}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t border-gray-100" />
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">+</span>
                    <div className="flex-1 border-t border-gray-100" />
                  </div>
                  {/* Secondary */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["CASH", "CARD", "UPI", "CHEQUE"] as const).map((m) => (
                        <button key={m} type="button"
                          onClick={() => setSplitMode(m)}
                          className={modeBtnCls(splitMode === m, "indigo")}>
                          {m === "UPI" ? "GPay/UPI" : m.charAt(0) + m.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number" value={splitAmt} onChange={(e) => setSplitAmt(e.target.value)}
                      placeholder="₹ Amount"
                      className={`${inputCls} font-bold border-indigo-200 focus:border-indigo-400`}
                      style={{ color: "#4338ca" }}
                    />
                  </div>
                  {(Number(splitAmt1) > 0 || Number(splitAmt) > 0) && (
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Total</span>
                      <span className="text-base font-extrabold text-gray-800">
                        ₹{((Number(splitAmt1) || 0) + (Number(splitAmt) || 0)).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Discount (₹)</label>
                      <input {...register("discount")} type="number" defaultValue={0} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Pending (₹)</label>
                      <input {...register("pendingAmount")} type="number" defaultValue={0} className={inputCls} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Mode (single only) */}
            {!splitEnabled && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["CASH", "UPI", "CARD", "CHEQUE", "BANK_TRANSFER", "FREE"] as const).map((m) => (
                    <button key={m} type="button"
                      onClick={() => setValue("paymentMode", m)}
                      className={modeBtnCls(paymentMode === m)}>
                      {m === "UPI" ? "GPay/UPI" : m === "BANK_TRANSFER" ? "Bank" : m.charAt(0) + m.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card Charge */}
            {showCardCharge && (
              <div className="rounded-lg p-3 space-y-2" style={{ background: "#f9f9f9", border: "1px solid #e5e7eb" }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Card Charge</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Charge %</label>
                    <input
                      type="number" value={cardChargePct} onChange={(e) => setCardChargePct(e.target.value)}
                      placeholder="e.g. 2" min={0} max={10} step={0.1} className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Charge ₹</label>
                    <input
                      type="number" value={cardChargeAmt} onChange={(e) => setCardChargeAmt(e.target.value)}
                      placeholder="0" min={0} className={inputCls}
                    />
                  </div>
                </div>
                {cardLeg > 0 && (
                  <p className="text-[11px] text-gray-400">Applied to ₹{cardLeg.toLocaleString("en-IN")} · enter % to auto-calculate or type ₹ directly</p>
                )}
              </div>
            )}

            {/* Company */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
              <select {...register("company")} className={inputCls}>
                <option value="YOS_FITNESS">Yos Fitness</option>
                <option value="YOS_FITNESS_STUDIO">Yos Fitness Studio</option>
              </select>
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Type</label>
              <select {...register("paymentType")} className={inputCls}>
                <option value="RENEWAL">Renewal</option>
                <option value="ADMISSION">Admission</option>
                <option value="BALANCE">Balance (clearing dues)</option>
              </select>
            </div>

            {/* Previous Receipt # — shown only for BALANCE payments */}
            {paymentType === "BALANCE" && (
              <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-xs font-bold text-red-400">Clearing balance on original receipt</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Original Receipt # *</label>
                  <input
                    {...register("previousReceiptNo")}
                    type="number"
                    placeholder="e.g. 2501"
                    className={inputCls}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">The pending amount on that receipt will be reduced automatically.</p>
                </div>
              </div>
            )}

            {/* Transaction Ref */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Ref / UPI ID</label>
              <input {...register("transactionRef")} className={inputCls} placeholder="UPI ref, cheque no..." />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input {...register("notes")} className={inputCls} placeholder="Optional note…" />
            </div>

            {/* Who Made the Sale? */}
            {trainers.length > 0 && (
              <div className="rounded-lg p-3 space-y-3" style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.12)" }}>
                <p className="text-xs font-bold text-orange-400 uppercase tracking-wide">
                  Who Made the Sale? <span className="font-normal text-gray-400 normal-case">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setSoldById(null); setSoldById2(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                      soldById === null ? "bg-gray-700 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}>
                    Common
                  </button>
                  {trainers.map((t) => (
                    <button key={t.id} type="button" onClick={() => setSoldById(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                        soldById === t.id ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"
                      }`}>
                      {t.fullName}
                    </button>
                  ))}
                </div>

                {soldById && (
                  <div className="space-y-2">
                    {soldById2 === null ? (
                      <div className="flex items-center gap-3">
                        <p className="text-[11px] text-orange-600 font-semibold">
                          ✓ {trainers.find((t) => t.id === soldById)?.fullName} · 100%
                        </p>
                        <button type="button" onClick={() => setSoldById2("")}
                          className="text-[11px] font-semibold text-gray-400 hover:text-orange-500 transition-colors underline underline-offset-2">
                          + Split with someone
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-orange-600 uppercase tracking-widest">Split Sale</p>
                          <button type="button" onClick={() => { setSoldById2(null); setSoldByPct(80); }}
                            className="text-[10px] text-gray-400 hover:text-red-400 transition-colors">
                            Remove split
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-center min-w-[72px]">
                            <p className="text-xs font-bold text-orange-600">{soldByPct}%</p>
                            <p className="text-[10px] text-gray-500 truncate max-w-[72px]">{trainers.find((t) => t.id === soldById)?.fullName}</p>
                          </div>
                          <input type="range" min={10} max={90} step={5} value={soldByPct}
                            onChange={(e) => setSoldByPct(Number(e.target.value))}
                            className="flex-1 accent-orange-500" />
                          <div className="text-center min-w-[72px]">
                            <p className="text-xs font-bold text-orange-400">{100 - soldByPct}%</p>
                            <p className="text-[10px] text-gray-500 truncate max-w-[72px]">
                              {soldById2 ? trainers.find((t) => t.id === soldById2)?.fullName : "2nd person"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {trainers.filter((t) => t.id !== soldById).map((t) => (
                            <button key={t.id} type="button" onClick={() => setSoldById2(t.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
                                soldById2 === t.id ? "bg-orange-400 border-orange-400 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"
                              }`}>
                              {t.fullName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Trainer Commission — admin only */}
            {userRole === "ADMIN" && trainers.length > 0 && (
              <div className="rounded-lg p-3 space-y-3" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                <p className="text-xs font-bold text-orange-400">Trainer Commission <span className="font-normal text-gray-500">(optional)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Assign to Trainer</label>
                    <select {...register("commissionTrainerId")} className={inputCls}>
                      <option value="">— None —</option>
                      {trainers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Commission %</label>
                    <input {...register("commissionPct")} type="number" min="0" max="100" step="0.5"
                      placeholder="e.g. 35" className={inputCls} />
                  </div>
                </div>
                {commissionTrainerId && commissionPreview > 0 && (
                  <p className="text-xs font-bold" style={{ color: "#fb923c" }}>
                    Trainer gets: ₹{commissionPreview.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Renew
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
