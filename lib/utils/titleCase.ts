const LOWER_WORDS = new Set(["and", "or", "of", "the", "in", "on", "at", "to", "for", "a", "an"]);

export function toTitleCase(str: string | null | undefined): string {
  if (!str) return "";
  // Ensure space after periods used as initial separators (e.g. "S.shifaya" → "S. shifaya")
  const normalized = str.replace(/\.([^\s])/g, ". $1");
  return normalized
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      if (!word) return word;
      if (i > 0 && word.length > 1 && LOWER_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .trim();
}

/** Normalise a person's name before saving to DB. */
export function normalizeName(name: string): string {
  return name
    .replace(/\.([^\s])/g, ". $1")   // space after period: "S.Shifaya" → "S. Shifaya"
    .replace(/\s{2,}/g, " ")          // collapse multiple spaces
    .trim();
}
