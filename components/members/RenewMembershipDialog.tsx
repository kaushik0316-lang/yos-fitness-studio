"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, RotateCcw, Receipt, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { renewMembership } from "@/lib/actions/members";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
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

export function RenewMembershipDialog({ open, onClose, member, packages, userId, userRole, trainers = [] }: Props) {
  const [loading, setLoading] = useState(false);
  const [successPaymentId, setSuccessPaymentId] = useState<string | null>(null);
  const [successExpiry, setSuccessExpiry] = useState<Date | null>(null);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      packageId: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      discount: "0",
      paymentMode: "CASH" as PaymentMode,
      company: "YOS_FITNESS" as Company,
      notes: "",
      commissionTrainerId: "",
      commissionPct: "",
    },
  });

  const selectedPackageId = watch("packageId");
  const selectedPkg = packages.find((p) => p.id === selectedPackageId);

  const commissionTrainerId = watch("commissionTrainerId");
  const commissionPct = parseFloat(watch("commissionPct") ?? "") || 0;
  const amountVal = parseFloat(watch("amount") ?? "") || Number(selectedPkg?.price ?? 0);
  const commissionPreview = amountVal && commissionPct ? Math.round(amountVal * commissionPct) / 100 : 0;

  const filteredPackages = packages;

  function handleClose() {
    reset();
    setSuccessPaymentId(null);
    setSuccessExpiry(null);
    onClose();
  }

  async function onSubmit(data: any) {
    if (!data.packageId) {
      toast({ title: "Select a package", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await renewMembership({
        memberId: member.id,
        packageId: data.packageId,
        startDate: data.startDate,
        amount: Number(data.amount) || Number(selectedPkg?.price ?? 0),
        discount: Number(data.discount) || 0,
        paymentMode: data.paymentMode as PaymentMode,
        company: data.company as Company,
        notes: data.notes || undefined,
        commissionTrainerId: data.commissionTrainerId || undefined,
        commissionPct: data.commissionPct ? Number(data.commissionPct) : undefined,
        memberName: member.fullName,
        packageName: selectedPkg?.name,
      });
      setSuccessPaymentId(result.paymentId);
      setSuccessExpiry(result.expiryDate!);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const previewExpiry = selectedPkg && watch("startDate")
    ? addDays(new Date(watch("startDate")), selectedPkg.durationDays)
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
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
        {!successPaymentId && <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-semibold text-gray-900">{member.fullName}</p>
            <p className="text-xs text-gray-400">{member.memberId}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Package *</label>
            <select {...register("packageId", { required: true })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
              <option value="">Select package</option>
              {filteredPackages.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — ₹{Number(p.price).toLocaleString("en-IN")}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input {...register("startDate")} type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expiry (preview)</label>
              <input
                readOnly
                value={previewExpiry ? format(previewExpiry, "dd MMM yyyy") : "—"}
                className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Amount
                {selectedPkg && <span className="text-gray-400 font-normal ml-1">(MRP: ₹{Number(selectedPkg.price).toLocaleString("en-IN")})</span>}
              </label>
              <input
                {...register("amount")}
                type="number"
                placeholder={selectedPkg ? String(Number(selectedPkg.price)) : "0"}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <input {...register("notes")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Optional note..." />
          </div>

          {/* Trainer commission — admin only */}
          {userRole === "ADMIN" && trainers.length > 0 && (
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Renew
            </Button>
          </DialogFooter>
        </form>}
      </DialogContent>
    </Dialog>
  );
}
