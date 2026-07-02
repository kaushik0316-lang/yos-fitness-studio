"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Loader2, CreditCard, Receipt } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { recordPayment } from "@/lib/actions/payments";
import { toast } from "@/hooks/use-toast";
import { Company, PaymentMode } from "@prisma/client";

type Trainer = { id: string; fullName: string };

type Props = {
  open: boolean;
  onClose: () => void;
  member: { id: string; memberId: string; fullName: string };
  packages: { id: string; name: string; price: any; durationDays: number; company: Company | null }[];
  userId: string;
  trainers?: Trainer[];
};

export function RecordPaymentDialog({ open, onClose, member, packages, userId, trainers = [] }: Props) {
  const [loading, setLoading] = useState(false);
  const [successPaymentId, setSuccessPaymentId] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, watch } = useForm({
    defaultValues: {
      amount: "",
      discount: "0",
      pendingAmount: "0",
      paymentMode: "CASH",
      packageId: "",
      company: "YOS_FITNESS",
      transactionRef: "",
      notes: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      commissionTrainerId: "",
      commissionPct: "",
    },
  });

  const commissionTrainerId = watch("commissionTrainerId");
  const commissionPct = parseFloat(watch("commissionPct") ?? "") || 0;
  const amountVal = parseFloat(watch("amount") ?? "") || 0;
  const commissionPreview = amountVal && commissionPct ? Math.round(amountVal * commissionPct) / 100 : 0;

  const selectedPackageId = useWatch({ control, name: "packageId" });
  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  function handleClose() {
    reset();
    setSuccessPaymentId(null);
    onClose();
  }

  async function onSubmit(data: any) {
    if (!data.amount || Number(data.amount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const hasPackageAndDate = !!data.packageId && !!data.startDate;
      const selectedPkg = packages.find(p => p.id === data.packageId);
      const result = await recordPayment({
        memberId: member.id,
        amount: Number(data.amount),
        discount: Number(data.discount) || 0,
        pendingAmount: Number(data.pendingAmount) || 0,
        paymentMode: data.paymentMode as PaymentMode,
        packageId: data.packageId || undefined,
        company: data.company as Company,
        transactionRef: data.transactionRef || undefined,
        notes: data.notes || undefined,
        createMembership: hasPackageAndDate,
        startDate: hasPackageAndDate ? data.startDate : undefined,
        commissionTrainerId: data.commissionTrainerId || undefined,
        commissionPct: data.commissionPct ? Number(data.commissionPct) : undefined,
        memberName: member.fullName,
        packageName: selectedPkg?.name,
      });
      setSuccessPaymentId(result.paymentId);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-purple-500" />
            Record Payment
          </DialogTitle>
        </DialogHeader>

        {successPaymentId && (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Payment Recorded!</p>
              <p className="text-sm text-gray-500 mt-1">{member.fullName}</p>
            </div>
            <div className="flex gap-3 w-full">
              <Link
                href={`/payments/${successPaymentId}/receipt?from=member`}
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

        {!successPaymentId && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-900">{member.fullName}</p>
              <p className="text-xs text-gray-400">{member.memberId}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
                <input {...register("amount")} type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="1500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Discount (₹)</label>
                <input {...register("discount")} type="number" defaultValue={0} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
                <select {...register("paymentMode")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="FREE">Free</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                <select {...register("company")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                  <option value="YOS_FITNESS">Yos Fitness</option>
                  <option value="YOS_FITNESS_STUDIO">Yos Fitness Studio</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Package</label>
              <select {...register("packageId")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="">No package linked</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Start date — shown when a package is selected */}
            {selectedPackage && (
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Membership Start Date *</label>
                  <input
                    {...register("startDate")}
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                  />
                </div>
                <p className="text-[11px] text-orange-700 font-medium">
                  ✓ Member will be set to <strong>ACTIVE</strong> · Package: {selectedPackage.name} · {selectedPackage.durationDays} days
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Ref / UPI ID</label>
              <input {...register("transactionRef")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="UPI ref, cheque no..." />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input {...register("notes")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Optional note..." />
            </div>

            {/* Trainer commission */}
            {trainers.length > 0 && (
              <div className="rounded-lg p-3 space-y-3" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                <p className="text-xs font-bold text-orange-400">Trainer Commission <span className="font-normal text-gray-500">(optional)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Assign to Trainer</label>
                    <select {...register("commissionTrainerId")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                      <option value="">— None —</option>
                      {trainers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Commission %</label>
                    <input {...register("commissionPct")} type="number" min="0" max="100" step="0.5"
                      placeholder="e.g. 35" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
