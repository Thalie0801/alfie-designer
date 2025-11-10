import type { DesignBrief } from "./designBrief";
import { allowsEmoji, applyTonePack, type TonePack } from "./tone";

function formatTemplateValue(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : "—";
}

export function renderBriefRecap(brief: DesignBrief, tone: TonePack): string {
  const block = [
    "**Récap de ta création**",
    `• Format: ${brief.format} • Objectif: ${brief.objective}`,
    `• Style: ${brief.style} • Template: ${formatTemplateValue(brief.templateId)}`,
    `• Contenu: “${brief.prompt}”`,
    "",
    "Tout est bon ? → [ Oui, lancer ]  [ Modifier ]",
  ].join("\n");

  return applyTonePack(block, tone);
}

export type ConfirmationOptions = {
  studioUrl?: string;
  libraryUrl?: string;
  tone?: TonePack;
};

export function renderLaunchConfirmation(
  orderId: string,
  { studioUrl, libraryUrl, tone = "brand_default" }: ConfirmationOptions = {},
): string {
  const studioLink = studioUrl ?? `/studio?order=${orderId}`;
  const libraryLink = libraryUrl ?? `/library?order=${orderId}`;

  const emoji = allowsEmoji(tone) ? "🚀 " : "";

  const message = [
    `${emoji}Génération lancée !`,
    `• Référence: ${orderId}`,
    `• Suivre l’avancement: [ Voir Studio ]  |  [ Voir Bibliothèque ]`,
    "",
    "Astuce: tu peux continuer à me briefer pendant que ça tourne.",
  ].join("\n");

  const withLinks = message
    .replace("[ Voir Studio ]", `[ Voir Studio ](${studioLink})`)
    .replace("[ Voir Bibliothèque ]", `[ Voir Bibliothèque ](${libraryLink})`);

  return applyTonePack(withLinks, tone);
}

export function renderUnavailableMessage(tone: TonePack): string {
  const content = [
    "Cette action n’est pas encore active. Je peux:",
    "1) Mettre la demande en file et la traiter dès activation",
    "2) Proposer un format image 1:1 équivalent tout de suite",
  ].join("\n");
  return applyTonePack(content, tone);
}

export type QueueStatusTemplate =
  | { kind: "queued" | "processing"; studioUrl: string; tone: TonePack }
  | { kind: "done"; previewUrl: string; downloadUrl?: string; tone: TonePack }
  | { kind: "error"; shortError: string; tone: TonePack };

export function renderQueueStatus(template: QueueStatusTemplate): string {
  switch (template.kind) {
    case "queued":
    case "processing": {
      const base = `En cours de rendu ⏳ — tu peux suivre ici : [Studio](${template.studioUrl}). Je te ping dès qu’une vignette arrive.`;
      return applyTonePack(base, template.tone);
    }
    case "done": {
      const downloadSection = template.downloadUrl
        ? ` | [Télécharger](${template.downloadUrl})`
        : "";
      const base = `C’est prêt ! [Ouvrir l’aperçu](${template.previewUrl})${downloadSection}`;
      return applyTonePack(base, template.tone);
    }
    case "error": {
      const base = `Il y a eu un blocage (‘${template.shortError}’). Je réessaie ou on adapte ? [Relancer] [Changer format]`;
      return applyTonePack(base, template.tone);
    }
  }
import type { AlfieIntent } from "./intent";

type TemplateId = string;

type TemplateDefinition = {
  id: TemplateId;
  label: string;
  ratios: AlfieIntent["ratio"][];
  description: string;
};

const templates: TemplateDefinition[] = [
  {
    id: "classic_hero",
    label: "Hero minimal",
    ratios: ["1:1", "4:5", "9:16"],
    description: "Visuel centré avec zone CTA bas, adapté aux posts produit.",
  },
  {
    id: "carousel_story",
    label: "Carrousel storytelling",
    ratios: ["9:16", "4:5"],
    description: "Structure 5 slides avec progression problème → solution → CTA.",
  },
  {
    id: "video_pulse",
    label: "Vidéo punchy",
    ratios: ["9:16", "16:9"],
    description: "Séquence dynamique pour reels ou ads awareness.",
  },
];

export function listTemplates(): TemplateDefinition[] {
  return templates;
}

export function findTemplate(id: TemplateId | null | undefined): TemplateDefinition | undefined {
  if (!id) return undefined;
  return templates.find((template) => template.id === id);
}
