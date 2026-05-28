"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, ChevronLeft, Check } from "lucide-react";
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
  email: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  healthConditions: z.string().optional(),
  intentionOfJoining: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  address: z.string().optional(),
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

const inputCls = "w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors";
const selectCls = `${inputCls} bg-white`;
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const INTENTIONS = ["WEIGHT LOSS", "MUSCLE GAIN", "GENERAL FITNESS", "REHABILITATION", "SPORTS PERFORMANCE", "FLEXIBILITY", "OTHER"];

export function AddMemberDialog({ open, onClose, packages, trainers, userId }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "ACTIVE",
      startDate: format(new Date(), "yyyy-MM-dd"),
      discount: "0",
    },
  });

  const selectedPackageId = watch("packageId");
  const selectedPkg = packages.find((p) => p.id === selectedPackageId);
  // Always YOS_FITNESS — Studio is for payments only
  const filteredPackages = packages.filter((p) => !p.company || p.company === "YOS_FITNESS");

  function handleClose() { reset(); setStep(0); onClose(); }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const result = await createMember({
        ...data,
        idCompany: "YOS_FITNESS",
        weight: data.weight ? Number(data.weight) : undefined,
        height: data.height ? Number(data.height) : undefined,
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

            {/* ── Step 0 — Personal Info ── */}
            {step === 0 && (
              <div className="grid grid-cols-2 gap-4">

                {/* Basic */}
                <div className="col-span-2">
                  <label className={labelCls}>Full Name *</label>
                  <input {...register("fullName")} className={inputCls} placeholder="e.g. Rajesh Kumar" />
                  {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
                </div>

                <div>
                  <label className={labelCls}>Phone *</label>
                  <input {...register("phone")} className={inputCls} placeholder="9876543210" />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>WhatsApp</label>
                  <input {...register("whatsapp")} className={inputCls} placeholder="Same as phone" />
                </div>

                <div className="col-span-2">
                  <label className={labelCls}>Email</label>
                  <input {...register("email")} type="email" className={inputCls} placeholder="rajesh@gmail.com" />
                </div>

                <div>
                  <label className={labelCls}>Gender</label>
                  <select {...register("gender")} className={selectCls}>
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input {...register("dateOfBirth")} type="date" className={inputCls} />
                </div>

                {/* Health */}
                <div>
                  <label className={labelCls}>Blood Group</label>
                  <select {...register("bloodGroup")} className={selectCls}>
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Intention of Joining</label>
                  <select {...register("intentionOfJoining")} className={selectCls}>
                    <option value="">Select</option>
                    {INTENTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Weight (kg)</label>
                  <input {...register("weight")} type="number" step="0.1" className={inputCls} placeholder="70" />
                </div>
                <div>
                  <label className={labelCls}>Height (cm)</label>
                  <input {...register("height")} type="number" step="0.1" className={inputCls} placeholder="170" />
                </div>

                <div className="col-span-2">
                  <label className={labelCls}>Health Conditions</label>
                  <input {...register("healthConditions")} className={inputCls} placeholder="Diabetes, BP, injuries, etc." />
                </div>

                {/* Emergency */}
                <div>
                  <label className={labelCls}>Emergency Contact</label>
                  <input {...register("emergencyContact")} className={inputCls} placeholder="Contact name" />
                </div>
                <div>
                  <label className={labelCls}>Emergency Phone</label>
                  <input {...register("emergencyPhone")} className={inputCls} placeholder="9876543210" />
                </div>

                {/* Admin */}
                <div>
                  <label className={labelCls}>Status</label>
                  <select {...register("status")} className={selectCls}>
                    <option value="ACTIVE">Active</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Assign Trainer</label>
                  <select {...register("trainerId")} className={selectCls}>
                    <option value="">No trainer</option>
                    {trainers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className={labelCls}>Address</label>
                  <input {...register("address")} className={inputCls} placeholder="Area, City" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Notes</label>
                  <textarea {...register("notes")} rows={2} className={`${inputCls} resize-none`} placeholder="Any notes about this member..." />
                </div>
              </div>
            )}

            {/* ── Step 1 — Membership ── */}
            {step === 1 && (
              <>
                <p className="text-sm text-gray-500">Assign a membership package and record the first payment. Skip if enrolling as a prospect.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelCls}>Package</label>
                    <select {...register("packageId")} className={selectCls}>
                      <option value="">No package (Prospect / Walk-in)</option>
                      {filteredPackages.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — ₹{Number(p.price).toLocaleString("en-IN")}</option>
                      ))}
                    </select>
                  </div>
                  {selectedPackageId && (
                    <>
                      <div>
                        <label className={labelCls}>Start Date</label>
                        <input {...register("startDate")} type="date" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Amount Paid (₹)
                          {selectedPkg && <span className="text-gray-400 font-normal ml-1">MRP: ₹{Number(selectedPkg.price).toLocaleString("en-IN")}</span>}
                        </label>
                        <input {...register("paymentAmount")} type="number" defaultValue={selectedPkg ? Number(selectedPkg.price) : undefined} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Discount (₹)</label>
                        <input {...register("discount")} type="number" defaultValue={0} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Payment Mode</label>
                        <select {...register("paymentMode")} className={selectCls}>
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="CARD">Card</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="FREE">Free / Complimentary</option>
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
                  Next →
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
