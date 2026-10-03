"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

type Props = { receiptNo: number | null | undefined; memberName: string };

// Browsers can't put a PDF on the clipboard (only text/html/PNG), so the receipt
// is copied as a PNG image — WhatsApp Web/Desktop paste it in as a picture.
export function CopyReceiptButton({ receiptNo, memberName }: Props) {
  const [status, setStatus] = useState<"idle" | "working" | "copied" | "downloaded">("idle");

  async function handleClick() {
    setStatus("working");
    try {
      const el = document.getElementById("receipt-card");
      if (!el) throw new Error("Receipt card not found");
      const html2canvas = (await import("html2canvas")).default;

      const blobPromise = html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false })
        .then((canvas) => new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render receipt"))), "image/png")
        ));

      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        // Passing the promise keeps the click's user-activation valid while the image renders
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
        setStatus("copied");
      } else {
        const blob = await blobPromise;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Receipt-${receiptNo ?? "receipt"}-${memberName.replace(/\s+/g, "_")}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus("downloaded");
      }
      setTimeout(() => setStatus("idle"), 6000);
    } catch (e: any) {
      setStatus("idle");
      alert(`Could not copy the receipt: ${e?.message ?? e}`);
    }
  }

  return (
    <div className="no-print flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={status === "working"}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60"
        style={{ background: "#fff", color: "#374151", borderColor: "#e5e7eb" }}
      >
        {status === "copied" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        {status === "working" ? "Copying…" : "Copy Receipt"}
      </button>
      {status === "copied" && <p className="text-xs text-green-600 font-medium">Copied — paste it in the chat (Ctrl+V)</p>}
      {status === "downloaded" && <p className="text-xs text-blue-600 font-medium">Clipboard unavailable — image downloaded instead</p>}
    </div>
  );
}
