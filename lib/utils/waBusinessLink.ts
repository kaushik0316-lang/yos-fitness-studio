function isAndroid() {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

/**
 * Returns a WhatsApp Business link.
 * - Android: intent URI targeting com.whatsapp.w4b (must be used as <a href>, not window.open)
 * - iOS/desktop: wa.me fallback
 */
export function waBusinessLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits.slice(-10)}`;

  if (isAndroid()) {
    const base = `intent://send?phone=${num}${message ? `&text=${encodeURIComponent(message)}` : ""}`;
    return `${base}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
  }

  return message
    ? `https://wa.me/${num}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${num}`;
}

/**
 * Programmatically opens WhatsApp Business.
 * Uses an anchor-click (not window.open) so Android intent URIs are not blocked by mobile Chrome.
 */
export function openWaBusinessLink(phone: string, message?: string): void {
  const url = waBusinessLink(phone, message);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
