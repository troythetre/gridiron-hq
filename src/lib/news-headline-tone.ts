export type NewsHeadlineTone = "good" | "bad" | "neutral";

export function getNewsHeadlineTone(headline: string): NewsHeadlineTone {
  const letters = headline.match(/[a-z]/gi);
  if (!letters || headline !== headline.toLocaleUpperCase()) return "neutral";

  const text = headline.toLowerCase();
  if (/\b(out|injur(?:y|ies|ed)|ruled out|placed on|ir|surgery|concussion|protocol|doubtful|questionable|miss(?:es|ing)?|sidelined|setback|banged up|torn|tear|suspension|suspended|ailing|limited)\b/.test(text)) {
    return "bad";
  }
  if (/\b(return(?:s|ed)?|back|cleared|active|available|healthy|upgraded|full participant|ready|expected to play|avoids|no injury|practiced fully|signed|recovered)\b/.test(text)) {
    return "good";
  }
  return "neutral";
}

export function newsHeadlineToneClass(headline: string): string {
  const tone = getNewsHeadlineTone(headline);
  if (tone === "good") return "text-emerald-300";
  if (tone === "bad") return "text-red-300";
  return "text-white";
}
