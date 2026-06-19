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

/** Normalise a person's name before saving to DB. */
export function normalizeName(name: string): string {
  return name
    .replace(/\./g, " ")         // dots → spaces
    .replace(/\s{2,}/g, " ")     // collapse multiple spaces
    .trim();
}
