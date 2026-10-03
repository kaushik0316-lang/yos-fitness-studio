"use client";

import { WaConfirmButton } from "@/components/whatsapp/WaConfirmButton";

type Props = { memberId: string; phone: string | null | undefined };

function isFakePhone(p: string | null | undefined): boolean {
  if (!p) return true;
  const d = p.replace(/\D/g, "");
  return d.length < 10 || /^0+$/.test(d) || /^(.)\1+$/.test(d);
}

export function OpenChatButton({ memberId, phone }: Props) {
  if (isFakePhone(phone)) return null;
  return (
    <WaConfirmButton
      memberId={memberId}
      phone={phone!}
      message=""
      waType="PAYMENT"
      label="Open Chat"
      className="no-print flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
      style={{ background: "#25d366", color: "#fff" }}
    />
  );
}
