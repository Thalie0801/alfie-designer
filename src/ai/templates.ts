import type { AlfieIntent } from "./intent";

export const Templates = {
  recapBeforeLaunch(intent: AlfieIntent) {
    return [
      "**Récap de ta création**",
      `• Format: ${intent.ratio} • Objectif: ${intent.goal}`,
      `• Template: ${intent.templateId ?? "—"}`,
      `• Contenu: "${intent.copyBrief}"`,
      "",
      "Tout est bon ? → [ Oui, lancer ]  [ Modifier ]",
    ].join("\n");
  },

  confirmAfterEnqueue(orderId: string, studioUrl: string, libraryUrl: string) {
    return [
      "🚀 Génération lancée !",
      `• Référence: ${orderId}`,
      `• Suivre l’avancement: [ Voir Studio ](${studioUrl})  |  [ Voir Bibliothèque ](${libraryUrl})`,
      "",
      "Astuce: tu peux continuer à me briefer pendant que ça tourne.",
    ].join("\n");
  },

  unavailable(action: "video" | "image" | "carousel", suggestImage: boolean = true) {
    const alt = suggestImage ? "\n2) Proposer un format image 1:1 équivalent tout de suite" : "";
    return [
      "Cette action n’est pas encore active. Je peux:",
      "1) Mettre la demande en file et la traiter dès activation",
      alt,
    ]
      .filter(Boolean)
      .join("\n");
  },

  statusQueued(studioUrl: string) {
    return `En cours de rendu ⏳ — tu peux suivre ici : [Studio](${studioUrl}). Je te ping dès qu’une vignette arrive.`;
  },

  statusDone(previewUrl: string, downloadUrl?: string) {
    const links = [`[Ouvrir l’aperçu](${previewUrl})`];
    if (downloadUrl) links.push(`[Télécharger](${downloadUrl})`);
    return `C’est prêt ! ${links.join(" | ")}`;
  },

  statusError(shortError: string) {
    return `Il y a eu un blocage (‘${shortError}’). Je réessaie ou on adapte ? [Relancer] [Changer format]`;
  },
};
export default Templates;
