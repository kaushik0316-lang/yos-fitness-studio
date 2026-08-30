"use client";

import { useState, useRef } from "react";
import { MessageCircle, Check, X } from "lucide-react";
import { logManualWA } from "@/lib/actions/whatsapp";
import { WaType, WA_TYPE_LABELS } from "@/lib/utils/waTypes";

type Props = {
  memberId: string;
  phone: string;            // 10-digit or full with country code
  message: string;
  waType: WaType;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  iconOnly?: boolean;
};

function buildWaUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function WaConfirmButton({
  memberId, phone, message, waType, label, className, style, iconOnly,
}: Props) {
  const [state, setState] = useState<"idle" | "confirming" | "saving" | "done">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick() {
    // Open WhatsApp
    window.open(buildWaUrl(phone, message), "_blank", "noopener,noreferrer");
    // Show confirmation bar
    setState("confirming");
    // Auto-dismiss after 30s if no action
    timerRef.current = setTimeout(() => setState("idle"), 30_000);
  }

  async function handleYes() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("saving");
    try {
      await logManualWA(memberId, waType, message);
      setState("done");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("idle");
    }
  }

  function handleNo() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("idle");
  }

  const typeLabel = WA_TYPE_LABELS[waType];

  return (
    <span className="relative inline-block">
      {/* Main button */}
      <button
        onClick={handleClick}
        className={className}
        style={style}
        title={`Send ${typeLabel} via WhatsApp`}
      >
        <MessageCircle className={iconOnly ? "h-4 w-4" : "h-3.5 w-3.5"} />
        {!iconOnly && (label ?? "WA")}
      </button>

      {/* Confirmation overlay */}
      {(state === "confirming" || state === "saving" || state === "done") && (
        <span
          className="fixed z-[9999] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold"
          style={{
            bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: "#1c1c1c", border: "1px solid #2a2a2a", color: "#fff",
            minWidth: 320, maxWidth: "90vw",
          }}
        >
          {state === "done" ? (
            <>
              <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span className="text-green-400">Logged as {typeLabel}</span>
            </>
          ) : state === "saving" ? (
            <span className="text-gray-400">Saving…</span>
          ) : (
            <>
              <MessageCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span className="flex-1 text-gray-300">Did you send the <span className="text-white">{typeLabel}</span>?</span>
              <button
                onClick={handleYes}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-green-500 hover:bg-green-600 text-white transition-colors"
              >
                Yes, sent
              </button>
              <button
                onClick={handleNo}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-transparent hover:bg-white/10 text-gray-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </span>
      )}
    </span>
  );
}
