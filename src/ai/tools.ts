import { createClient } from "@supabase/supabase-js";
import type { DesignBrief } from "./designBrief";

export type EnqueueJobArgs = { brief: DesignBrief };

export type EnqueueJobResult = {
  orderId: string;
  jobId: string;
  queueSize?: number;
};

export type SearchAssetsArgs = {
  brandId: string;
  orderId?: string;
};

export type LibraryAsset = {
  id: string;
  orderId: string | null;
  type?: string | null;
  preview_url?: string | null;
  download_url?: string | null;
  cloudinary_url?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SearchAssetsResult = {
  assets: LibraryAsset[];
};

type EnvSource = Record<string, unknown> | undefined;

function readEnv(key: string, env?: EnvSource): string | undefined {
  if (env && typeof env[key] === "string") {
    return env[key] as string;
  }
  if (typeof process !== "undefined" && process.env && typeof process.env[key] === "string") {
    return process.env[key] as string;
  }
  if (typeof import.meta !== "undefined" && (import.meta as any)?.env && typeof (import.meta as any).env[key] === "string") {
    return (import.meta as any).env[key] as string;
  }
  return undefined;
}

function createSupabaseClient(env?: EnvSource) {
  const url = readEnv("SUPABASE_URL", env) ?? readEnv("VITE_SUPABASE_URL", env);
  const key =
    readEnv("SUPABASE_SERVICE_ROLE_KEY", env) ??
    readEnv("SUPABASE_ANON_KEY", env) ??
    readEnv("VITE_SUPABASE_PUBLISHABLE_KEY", env);

  if (!url || !key) {
    throw new Error("Supabase non configuré pour les outils Alfie");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function enqueueJob({ brief }: EnqueueJobArgs, env?: EnvSource): Promise<EnqueueJobResult> {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase.functions.invoke("enqueue_job", {
    body: { brief },
  });

  if (error) {
    throw new Error(error.message ?? "Échec de enqueue_job");
  }

  const payload = (data as Partial<EnqueueJobResult>) ?? {};
  if (!payload.orderId || !payload.jobId) {
    throw new Error("Réponse enqueue_job incomplète");
  }

  return {
    orderId: payload.orderId,
    jobId: payload.jobId,
    queueSize: payload.queueSize,
  };
}

export async function searchAssets(
  params: SearchAssetsArgs,
  env?: EnvSource,
): Promise<SearchAssetsResult> {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase.functions.invoke("search_assets", {
    body: params,
  });

  if (error) {
    throw new Error(error.message ?? "Échec de search_assets");
  }

  const payload = (data as SearchAssetsResult) ?? { assets: [] };
  return {
    assets: Array.isArray(payload.assets) ? payload.assets : [],
import type { AlfieIntent } from "./intent";

export type PlannerAction =
  | { type: "smalltalk"; response: string; quickReplies?: string[] }
  | { type: "question"; response: string; quickReplies?: string[] }
  | { type: "intent"; response: string; intent: Partial<AlfieIntent>; missingFields: MissingField[] };

export type MissingField = "template" | "slides" | "cta" | "assets";

const KEYWORDS = {
  carousel: /\b(carrousel|carousel|slides?)\b/i,
  video: /\b(video|vidéo|reel|short|tiktok)\b/i,
  text: /\b(copy|texte|script)\b/i,
};

function detectKind(message: string): AlfieIntent["kind"] {
  if (KEYWORDS.carousel.test(message)) return "carousel";
  if (KEYWORDS.video.test(message)) return "video";
  if (KEYWORDS.text.test(message)) return "text";
  return "image";
}

function detectGoal(message: string): AlfieIntent["goal"] | undefined {
  if (/lead/i.test(message)) return "lead";
  if (/vente|sale|conversion/i.test(message)) return "sale";
  if (/awareness|notoriété/i.test(message)) return "awareness";
  return undefined;
}

function detectRatio(message: string): AlfieIntent["ratio"] | undefined {
  if (/9\s*:\s*16/.test(message)) return "9:16";
  if (/16\s*:\s*9/.test(message)) return "16:9";
  if (/4\s*:\s*5/.test(message)) return "4:5";
  if (/3\s*:\s*4/.test(message)) return "3:4";
  if (/1\s*:\s*1/.test(message)) return "1:1";
  return undefined;
}

function detectTone(message: string): AlfieIntent["tone_pack"] | undefined {
  if (/fun|dynamique|playful|jeune/i.test(message)) return "playful";
  if (/premium|luxe|apple/i.test(message)) return "apple_like";
  if (/b2b|professionnel|sérieux|sobre/i.test(message)) return "b2b_crisp";
  return undefined;
}

function detectSlides(message: string): number | undefined {
  const match = message.match(/(\d{1,2})\s*(slides?|écrans?)/i);
  if (!match) return undefined;
  const value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.min(value, 20);
}

function detectTemplate(message: string): string | undefined {
  const match = message.match(/template\s*[:#-]?\s*([a-z0-9_-]+)/i);
  if (!match) return undefined;
  return match[1];
}

function detectCta(message: string): string | undefined {
  const match = message.match(/cta\s*[:#-]?\s*([^\n]+)/i);
  if (!match) return undefined;
  return match[1].trim();
}

function looksLikeSmallTalk(message: string): boolean {
  return /bonjour|salut|merci|ça va|comment ça va|hello|hey/i.test(message) && message.length < 80;
}

function looksLikeQuestion(message: string): boolean {
  return /\?$/.test(message.trim());
}

export function planFromMessage(
  message: string,
  baseIntent: Partial<AlfieIntent>,
): PlannerAction {
  const normalized = message.trim();
  if (!normalized) {
    return { type: "question", response: "Tu peux me donner quelques détails sur ce que tu veux créer ?" };
  }

  if (looksLikeSmallTalk(normalized)) {
    return {
      type: "smalltalk",
      response: "Hello 👋 Prêt·e à créer une nouvelle campagne ? Donne-moi un brief et je prépare tout.",
      quickReplies: ["Image produit", "Carrousel 5 slides", "Vidéo 9:16"],
    };
  }

  if (looksLikeQuestion(normalized)) {
    return {
      type: "question",
      response: "Bonne question ! Je peux te proposer un format adapté si tu me précises le contexte (objectif, format, CTA...).",
    };
  }

  const kind = detectKind(normalized);
  const goal = detectGoal(normalized) ?? baseIntent.goal;
  const ratio = detectRatio(normalized) ?? baseIntent.ratio;
  const tone = detectTone(normalized) ?? baseIntent.tone_pack;
  const slides = detectSlides(normalized) ?? baseIntent.slides ?? undefined;
  const templateId = detectTemplate(normalized) ?? baseIntent.templateId ?? undefined;
  const cta = detectCta(normalized) ?? baseIntent.cta ?? undefined;

  const intent: Partial<AlfieIntent> = {
    ...baseIntent,
    kind,
    goal,
    ratio,
    tone_pack: tone,
    slides: slides ?? undefined,
    templateId,
    cta,
    copyBrief: normalized,
  };

  const missing: MissingField[] = [];
  if (kind === "carousel" && !slides) missing.push("slides");
  if (kind === "video" && !templateId) missing.push("template");
  if (kind === "image" && !cta) missing.push("cta");

  return {
    type: "intent",
    response: "Je t'ai préparé un récap, valide-le pour lancer la génération.",
    intent,
    missingFields: missing,
  };
}
