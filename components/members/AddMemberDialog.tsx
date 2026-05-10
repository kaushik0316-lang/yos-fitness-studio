"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, User, Phone, Building2, ChevronRight, ChevronLeft, Check, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createMember } from "@/lib/actions/members";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Company } from "@prisma/client";

const schema = z.object({
  fullName: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone required"),
  whatsapp: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  primaryCompany: z.enum(["YOS_FITNESS", "YOS_FITNESS_STUDIO"]),
  trainerId: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "FROZEN", "INACTIVE", "PROSPECT"]),
  packageId: z.string().optional(),
  startDate: z.string().optional(),
  paymentAmount: z.string().optional(),
  discount: z.string().optional(),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "FREE"]).optional(),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  packages: { id: string; name: string; price: any; company: Company | null }[];
  trainers: { id: string; fullName: string }[];
  userId: string;
};

const STEPS = ["Personal Info", "Membership"];

export function AddMemberDialog({ open, onClose, packages, trainers, userId }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      primaryCompany: "YOS_FITNESS",
      status: "ACTIVE",
      startDate: format(new Date(), "yyyy-MM-dd"),
      discount: "0",
    },
  });

  const selectedPackageId = watch("packageId");
  const selectedCompany = watch("primaryCompany") as Company;
  const selectedPkg = packages.find((p) => p.id === selectedPackageId);
  const filteredPackages = packages.filter((p) => !p.company || p.company === selectedCompany);

  function handleClose() { reset(); setStep(0); onClose(); }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const result = await createMember({
        ...data,
        paymentAmount: data.paymentAmount ? Number(data.paymentAmount) : undefined,
        discount: data.discount ? Number(data.discount) : 0,
      });
      toast({ title: "Member added!", description: `Registered as ${result.memberId}` });
      handleClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5">
          <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add New Member
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-sm font-medium transition-all ${i === step ? "text-white" : i < step ? "text-orange-200" : "text-orange-300"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i === step ? "bg-white text-orange-600 border-white" : i < step ? "bg-orange-400 border-orange-400 text-white" : "border-orange-400 text-orange-400"}`}>
                    {i < step ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  {s}
                </div>
                {i < STEPS.length - 1 && <div className="w-8 h-px bg-orange-400 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">

            {/* Step 0 — Personal Info */}
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name *</label>
                    <input {...register("fullName")} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors" placeholder="e.g. Rajesh Kumar" />
                    {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone *</label>
                    <input {...register("phone")} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors" placeholder="9876543210" />
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">WhatsApp</label>
                    <input {...register("whatsapp")} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors" placeholder="Same as phone" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Gender</label>
                    <select {...register("gender")} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors bg-white">
                      <option value="">Select</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                    <select {...register("status")} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors bg-white">
                      <option value="ACTIVE">Active</option>
                      <option value="PROSPECT">Prospect</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Company *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "YOS_FITNESS", label: "Yos Fitness", color: "orange" },
                        { value: "YOS_FITNESS_STUDIO", label: "Yos Fitness Studio", color: "indigo" },
                      ].map((c) => {
                        const isSelected = watch("primaryCompany") === c.value;
                        return (
                          <label key={c.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}>
                            <input type="radio" {...register("primaryCompany")} value={c.value} className="hidden" />
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-orange-500" : "border-gray-300"}`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{c.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Assign Trainer</label>
                    <select {...register("trainerId")} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors bg-white">
                      <option value="">No trainer</option>
                      {trainers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
                    <input {...register("address")} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors" placeholder="Area, City" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
                    <textarea {...register("notes")} rows={2} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors resize-none" placeholder="Any notes about this member..." />
                  </div>
                </div>
              </>
            )}

            {/* Step 1 — Membership */}
            {step === 1 && (
              <>
                <p className="text-sm text-gray-500">Assign a membership package and record the first payment. Skip if enrolling as a prospect.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Package</label>
                    <select {...register("packageId")} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors bg-white">
                      <option value="">No package (Prospect / Walk-in)</option>
                      {filteredPackages.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — ₹{Number(p.price).toLocaleString("en-IN")}</option>
                      ))}
                    </select>
                  </div>
                  {selectedPackageId && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Start Date</label>
                        <input {...register("startDate")} type="date" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Amount Paid (₹)
                          {selectedPkg && <span className="text-gray-400 font-normal ml-1">MRP: ₹{Number(selectedPkg.price).toLocaleString("en-IN")}</span>}
                        </label>
                        <input {...register("paymentAmount")} type="number" defaultValue={selectedPkg ? Number(selectedPkg.price) : undefined} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Discount (₹)</label>
                        <input {...register("discount")} type="number" defaultValue={0} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Payment Mode</label>
                        <select {...register("paymentMode")} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors bg-white">
                          <option value="CASH">💵 Cash</option>
                          <option value="UPI">📱 UPI</option>
                          <option value="CARD">💳 Card</option>
                          <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                          <option value="FREE">🎁 Free / Complimentary</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
            <button type="button" onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button type="button" size="sm" onClick={() => setStep(s => s + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" size="sm" disabled={loading} className="px-6">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Add Member
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
