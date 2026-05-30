"use client";

import { useEffect } from "react";

function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

const SKIP_TYPES = new Set(["email", "password", "number", "date", "time", "color", "range", "checkbox", "radio", "file", "search"]);
const SKIP_AUTOCOMPLETE = new Set(["current-password", "new-password", "email", "username"]);

export function TitleCaseInput() {
  useEffect(() => {
    function handleInput(e: Event) {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return;
      if (el.dataset.noCapitalize !== undefined) return;
      if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) return;
      if (el.autocomplete && SKIP_AUTOCOMPLETE.has(el.autocomplete)) return;

      const start = el.selectionStart;
      const end   = el.selectionEnd;
      const converted = toTitleCase(el.value);
      if (converted !== el.value) {
        el.value = converted;
        // Restore cursor position
        try { el.setSelectionRange(start, end); } catch {}
        // Fire React's synthetic onChange
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        nativeInputValueSetter?.call(el, converted);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    document.addEventListener("input", handleInput, true);
    return () => document.removeEventListener("input", handleInput, true);
  }, []);

  return null;
}
