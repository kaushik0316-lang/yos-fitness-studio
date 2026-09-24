/**
 * Generates a link that opens WhatsApp Business directly on Android.
 * On iOS / desktop falls back to wa.me (no way to target WA Business specifically on iOS).
 */
export function waBusinessLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits.slice(-10)}`;

  const isAndroid =
    typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

  if (isAndroid) {
    const base = `intent://send?phone=${num}${message ? `&text=${encodeURIComponent(message)}` : ""}`;
    return `${base}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
  }

  return message
    ? `https://wa.me/${num}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${num}`;
}
