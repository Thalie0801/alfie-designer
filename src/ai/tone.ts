export type TonePack = "brand_default" | "apple_like" | "playful" | "b2b_crisp";

type ToneDefinition = {
  sentences: "short" | "normal";
  emoji: 0 | 1;
  jargon: "low" | "med";
};

export const TONES: Record<TonePack, ToneDefinition> = {
  brand_default: { sentences: "normal", emoji: 1, jargon: "med" },
  apple_like: { sentences: "short", emoji: 0, jargon: "low" },
  playful: { sentences: "normal", emoji: 1, jargon: "low" },
  b2b_crisp: { sentences: "short", emoji: 0, jargon: "low" },
};

const emojiRegex = /\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu;

export function applyTonePack(text: string, tone: TonePack): string {
  const def = TONES[tone];
  let output = text;

  if (def.emoji === 0) {
    output = output.replace(emojiRegex, "");
  }

  if (def.sentences === "short") {
    output = enforceShortSentences(output);
  }

  return output.replace(/[ \t]+\n/g, "\n").trim();
}

function enforceShortSentences(value: string): string {
  const sentences = value
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const adjusted = sentences.map((sentence) => {
    if (sentence.length <= 140) return sentence;
    const chunks = [] as string[];
    let remaining = sentence;
    while (remaining.length > 0) {
      const slice = remaining.slice(0, 130);
      const cutIndex = Math.max(slice.lastIndexOf(","), slice.lastIndexOf(" "));
      const safeIndex = cutIndex > 60 ? cutIndex : Math.min(remaining.length, 130);
      chunks.push(remaining.slice(0, safeIndex).trim());
      remaining = remaining.slice(safeIndex).trim();
    }
    return chunks.join(". ");
  });

  return adjusted.join(" ");
}

export function allowsEmoji(tone: TonePack): boolean {
  return TONES[tone].emoji === 1;
}

export function prefersShortSentences(tone: TonePack): boolean {
  return TONES[tone].sentences === "short";
}
