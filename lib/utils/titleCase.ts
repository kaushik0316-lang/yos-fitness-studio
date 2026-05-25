const LOWER_WORDS = new Set(["and", "or", "of", "the", "in", "on", "at", "to", "for", "a", "an"]);

export function toTitleCase(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      if (!word) return word;
      // Always capitalise first word and proper nouns; lowercase connecting words mid-sentence
      if (i > 0 && LOWER_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
