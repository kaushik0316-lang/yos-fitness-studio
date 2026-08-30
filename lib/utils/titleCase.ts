const LOWER_WORDS = new Set(["and", "or", "of", "the", "in", "on", "at", "to", "for", "a", "an"]);

export function toTitleCase(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/\./g, " ")        // dots → spaces
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      if (!word) return word;
      if (i > 0 && word.length > 1 && LOWER_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Extract a usable first name, skipping single-letter initials.
 * "T Badhma Prakash" → "Badhma", "M A Rajasekaran" → "Rajasekaran", "Gopala Krishnan" → "Gopala"
 */
export function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const words = fullName.trim().split(/\s+/);
  const meaningful = words.find((w) => w.length > 1);
  return meaningful ?? words[0] ?? "";
}


/** Normalise a person's name before saving to DB. */
export function normalizeName(name: string): string {
  return name
    .replace(/\./g, " ")         // dots → spaces
    .replace(/\s{2,}/g, " ")     // collapse multiple spaces
    .trim();
}
