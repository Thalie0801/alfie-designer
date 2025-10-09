// Routing vidéo intelligent (Sora vs Veo 3)
// Règles: Sora = 1 Woof, Veo 3 = 4 Woofs

export const VEO3_WOOF_FACTOR = 4;
export const SORA_WOOF_FACTOR = 1;

export type VideoEngine = 'sora' | 'veo3';

export interface VideoRoutingDecision {
  engine: VideoEngine;
  woofCost: number;
  reason: string;
}

export interface VideoRequest {
  seconds: number;
  style?: string;
  remainingWoofs?: number;
}

/**
 * Détermine quel moteur vidéo utiliser selon les règles produit
 * 
 * Règles:
 * - seconds ≤ 10 ET style "reel/loop/intro" → Sora
 * - seconds > 10 OU style "cinématique/ads/visage" → Veo 3
 * - Si remainingWoofs < 4 → forcer Sora (fallback)
 */
export function routeVideoEngine(request: VideoRequest): VideoRoutingDecision {
  const { seconds, style = '', remainingWoofs } = request;
  
  // Hard limit: si moins de 4 Woofs, forcer Sora
  if (remainingWoofs !== undefined && remainingWoofs < VEO3_WOOF_FACTOR) {
    return {
      engine: 'sora',
      woofCost: SORA_WOOF_FACTOR,
      reason: 'Budget Woofs insuffisant pour Veo 3, fallback sur Sora'
    };
  }

  const styleLower = style.toLowerCase();
  
  // Styles qui favorisent Sora (rapide, court, loop)
  const soraStyles = ['reel', 'loop', 'intro', 'quick', 'rapide', 'court'];
  const isSoraStyle = soraStyles.some(s => styleLower.includes(s));

  // Styles qui favorisent Veo 3 (qualité, cinéma, complexe)
  const veo3Styles = ['cinématique', 'cinematic', 'ads', 'pub', 'visage', 'face', 'complexe', 'détaillé'];
  const isVeo3Style = veo3Styles.some(s => styleLower.includes(s));

  // Règle 1: Court (≤ 10s) + style Sora → Sora
  if (seconds <= 10 && (isSoraStyle || !isVeo3Style)) {
    return {
      engine: 'sora',
      woofCost: SORA_WOOF_FACTOR,
      reason: 'Vidéo courte (≤10s) avec style adapté à Sora'
    };
  }

  // Règle 2: Long (> 10s) OU style Veo3 → Veo 3
  if (seconds > 10 || isVeo3Style) {
    return {
      engine: 'veo3',
      woofCost: VEO3_WOOF_FACTOR,
      reason: seconds > 10 
        ? 'Vidéo longue (>10s), nécessite Veo 3'
        : 'Style complexe/cinématique, nécessite Veo 3'
    };
  }

  // Default: Sora (plus économique)
  return {
    engine: 'sora',
    woofCost: SORA_WOOF_FACTOR,
    reason: 'Par défaut (économique)'
  };
}

/**
 * Estime la durée d'une vidéo depuis un prompt
 * Retourne une estimation en secondes
 */
export function estimateVideoDuration(prompt: string): number {
  const promptLower = prompt.toLowerCase();
  
  // Détection explicite de durée
  const durationMatch = prompt.match(/(\d+)\s*(s|sec|second|secondes)/i);
  if (durationMatch) {
    return parseInt(durationMatch[1], 10);
  }

  // Mots-clés qui indiquent une durée
  if (/court|rapide|quick|intro|teaser/.test(promptLower)) return 5;
  if (/long|détaillé|complet|full/.test(promptLower)) return 15;
  if (/story|reel|tiktok/.test(promptLower)) return 8;
  
  // Default: 8 secondes (bon compromis)
  return 8;
}

/**
 * Détecte le style vidéo depuis un prompt
 */
export function detectVideoStyle(prompt: string): string {
  const promptLower = prompt.toLowerCase();
  
  if (/cinéma|cinematic|film|movie/.test(promptLower)) return 'cinématique';
  if (/pub|ads|commercial|promo/.test(promptLower)) return 'ads';
  if (/reel|story|tiktok/.test(promptLower)) return 'reel';
  if (/loop|répét|boucle/.test(promptLower)) return 'loop';
  if (/intro|opening/.test(promptLower)) return 'intro';
  
  return 'standard';
}