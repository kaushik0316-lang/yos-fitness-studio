"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { WaConfirmButton } from "@/components/whatsapp/WaConfirmButton";
import { toTitleCase } from "@/lib/utils/titleCase";

type Props = {
  url: string;
  amount: number;
  validDays: number;
  memberId: string;
  memberName: string;
  phone: string;
  description: string;
  billCount?: number;
  onClose: () => void;
};

function isFakePhone(p: string): boolean {
  const d = p.replace(/\D/g, "");
  return d.length < 10 || /^0+$/.test(d) || /^(.)\1+$/.test(d);
}

export function PaymentLinkDialog({ url, amount, validDays, memberId, memberName, phone, description, billCount = 1, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const amountStr = new Intl.NumberFormat("en-IN").format(amount);

  const message =
    `Hi ${toTitleCase(memberName)}, here is your secure payment link for ₹${amountStr} (${description}) at Yos Fitness Studio:\n\n${url}\n\n` +
    `The link is valid for ${validDays} days. Your receipt will be shared once the payment is done.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900">Payment link ready</p>
            <p className="text-xs text-gray-500 mt-0.5">₹{amountStr} · {description}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 break-all font-mono">{url}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            {!isFakePhone(phone) && (
              <WaConfirmButton
                memberId={memberId}
                phone={phone}
                message={message}
                waType="PAYMENT"
                label="Send via WhatsApp Business"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "#25d366", color: "#fff" }}
              />
            )}
          </div>
          <p className="text-xs text-gray-500">
            When {toTitleCase(memberName)} pays, {billCount > 1 ? `${billCount} separate receipts are` : "the receipt is"} created automatically and the membership{billCount > 1 ? "s are" : " is"} updated. You'll find {billCount > 1 ? "them" : "it"} under Payments.
          </p>
        </div>
      </div>
    </div>
  );
}
