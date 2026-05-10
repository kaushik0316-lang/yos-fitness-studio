"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { recordPayment } from "@/lib/actions/payments";
import { toast } from "@/hooks/use-toast";
import { Company, PaymentMode } from "@prisma/client";

type Props = {
  open: boolean;
  onClose: () => void;
  member: { id: string; memberId: string; fullName: string; primaryCompany: Company };
  packages: { id: string; name: string; price: any; company: Company | null }[];
  userId: string;
};

export function RecordPaymentDialog({ open, onClose, member, packages, userId }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      amount: "",
      discount: "0",
      pendingAmount: "0",
      paymentMode: "CASH",
      packageId: "",
      company: member.primaryCompany,
      transactionRef: "",
      notes: "",
    },
  });

  function handleClose() {
    reset();
    onClose();
  }

  async function onSubmit(data: any) {
    if (!data.amount || Number(data.amount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await recordPayment({
        memberId: member.id,
        amount: Number(data.amount),
        discount: Number(data.discount) || 0,
        pendingAmount: Number(data.pendingAmount) || 0,
        paymentMode: data.paymentMode as PaymentMode,
        packageId: data.packageId || undefined,
        company: data.company as Company,
        transactionRef: data.transactionRef || undefined,
        notes: data.notes || undefined,
        createMembership: false,
      });
      toast({ title: "Payment recorded!", description: `₹${Number(data.amount).toLocaleString("en-IN")} collected` });
      handleClose();
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Package (optional)</label>
            <select {...register("packageId")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
              <option value="">No package linked</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Ref / UPI ID</label>
            <input {...register("transactionRef")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="UPI ref, cheque no..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <input {...register("notes")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Optional note..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
