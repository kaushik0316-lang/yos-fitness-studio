"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { renewMembership } from "@/lib/actions/members";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { Company, PaymentMode } from "@prisma/client";

type Props = {
  open: boolean;
  onClose: () => void;
  member: { id: string; memberId: string; fullName: string; primaryCompany: Company };
  packages: { id: string; name: string; price: any; durationDays: number; company: Company | null }[];
  userId: string;
};

export function RenewMembershipDialog({ open, onClose, member, packages, userId }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      packageId: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      discount: "0",
      paymentMode: "CASH" as PaymentMode,
      company: member.primaryCompany,
      notes: "",
    },
  });

  const selectedPackageId = watch("packageId");
  const selectedPkg = packages.find((p) => p.id === selectedPackageId);

  const filteredPackages = packages.filter(
    (p) => !p.company || p.company === member.primaryCompany
  );

  function handleClose() {
    reset();
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
      });
      toast({
        title: "Membership renewed!",
        description: `Valid till ${format(result.expiryDate!, "dd MMM yyyy")}`,
      });
      handleClose();
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Renew
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
