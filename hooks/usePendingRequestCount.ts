"use client";

import { useEffect, useState } from "react";

const POLL_MS = 60_000;

// Count of member requests waiting for staff (for the sidebar badge).
export function usePendingRequestCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/requests/pending-count");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCount(Number(data.count) || 0);
      } catch { /* offline — try again next tick */ }
    }
    check();
    const t = setInterval(check, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [enabled]);

  return count;
}
