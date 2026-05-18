const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
  const h = Math.floor(n / 100);
  const rem = n % 100;
  return ones[h] + " Hundred" + (rem !== 0 ? " and " + belowThousand(rem) : "");
}

export function amountToWords(amount: number): string {
  const n = Math.floor(amount);
  if (n === 0) return "Zero";

  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const rest = n % 1_000;

  const parts: string[] = [];
  if (crore > 0) parts.push(belowThousand(crore) + " Crore");
  if (lakh > 0) parts.push(belowThousand(lakh) + " Lakh");
  if (thousand > 0) parts.push(belowThousand(thousand) + " Thousand");
  if (rest > 0) parts.push(belowThousand(rest));

  return parts.join(" ");
}
