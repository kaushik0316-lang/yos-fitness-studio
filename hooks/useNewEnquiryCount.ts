"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const KEY = "enquiries_last_seen";
const POLL_MS = 60_000;

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked */ } };

// Count of enquiries added since this browser last opened the Enquiries page.
export function useNewEnquiryCount(enabled: boolean) {
  const pathname = usePathname();
  const onPage = pathname.startsWith("/enquiries");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    // Opening the page (or the very first visit) marks everything so far as seen
    if (onPage || !read()) { write(new Date().toISOString()); setCount(0); }
    if (onPage) return;

    let cancelled = false;
    async function check() {
      const since = read();
      if (!since) return;
      try {
        const res = await fetch(`/api/enquiries/new-count?since=${encodeURIComponent(since)}`);
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
  }, [enabled, onPage]);

  return count;
}
