// Routing vidéo intelligent (Sora vs Veo 3)
// Règles: Sora = 1 Woof, Veo 3 = 4 Woofs
import { FEATURE_FLAGS, SYSTEM_CONFIG } from '@/config/systemConfig';

export const VEO3_WOOF_FACTOR = SYSTEM_CONFIG.VEO3_WOOF_FACTOR;
export const SORA_WOOF_FACTOR = SYSTEM_CONFIG.SORA_WOOF_FACTOR;

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

export interface VideoRoutingOptions {
  veo3Enabled?: boolean;
}

/**
 * Détermine quel moteur vidéo utiliser selon les règles produit
 * 
 * Règles actuelles:
 * - Sora2 uniquement pour l'instant (via Kie AI)
 * - Veo 3 sera activé quand FEATURE_FLAGS.VEO3_ENABLED=true
 */
const QUICK_STYLES = new Set([
  'reel',
  'loop',
  'intro',
  'quick',
  'teaser',
  'story',
  'tiktok',
]);

const PREMIUM_STYLES = new Set([
  'cinématique',
  'cinematic',
  'cinema',
  'ads',
  'pub',
  'publicité',
  'hero',
  'visage',
  'face',
  'portrait',
  'complexe',
  'complex',
]);

export function routeVideoEngine(
  request: VideoRequest,
  options: VideoRoutingOptions = {}
): VideoRoutingDecision {
  const duration = Number.isFinite(request.seconds) ? Math.max(0, request.seconds) : 0;
  const normalizedStyle = request.style?.toLowerCase().trim() ?? 'standard';
  const remainingWoofs = request.remainingWoofs ?? Number.POSITIVE_INFINITY;

  const hasBudgetForSora = remainingWoofs >= SORA_WOOF_FACTOR;
  const hasBudgetForVeo = remainingWoofs >= VEO3_WOOF_FACTOR;
  const veoEnabled = options.veo3Enabled ?? FEATURE_FLAGS.VEO3_ENABLED;

  const isQuickStyle = QUICK_STYLES.has(normalizedStyle);
  const isPremiumStyle = PREMIUM_STYLES.has(normalizedStyle);
  const isLongForm = duration > 10;

  if (!hasBudgetForSora) {
    return {
      engine: 'sora',
      woofCost: SORA_WOOF_FACTOR,
      reason: 'Quota Woofs épuisé : Sora forcé (pilotage hard-stop)',
    };
  }

  if (veoEnabled && hasBudgetForVeo && (isLongForm || isPremiumStyle) && !isQuickStyle) {
    const reasonParts: string[] = [];
    if (isLongForm) {
      reasonParts.push(`durée ${duration}s (>10s)`);
    }
    if (isPremiumStyle) {
      reasonParts.push(`style ${normalizedStyle}`);
    }
    const reasonDetail = reasonParts.length ? ` (${reasonParts.join(' + ')})` : '';
    return {
      engine: 'veo3',
      woofCost: VEO3_WOOF_FACTOR,
      reason: `Veo 3 sélectionné${reasonDetail}`.trim(),
    };
  }

  if (!veoEnabled && (isLongForm || isPremiumStyle) && !isQuickStyle) {
    return {
      engine: 'sora',
      woofCost: SORA_WOOF_FACTOR,
      reason: 'Feature flag Veo 3 désactivé : fallback Sora',
    };
  }

  if (veoEnabled && !hasBudgetForVeo && (isLongForm || isPremiumStyle) && !isQuickStyle) {
    return {
      engine: 'sora',
      woofCost: SORA_WOOF_FACTOR,
      reason: `Budget Woofs insuffisant pour Veo 3 (reste ${remainingWoofs})`,
    };
  }

  if (isQuickStyle) {
    return {
      engine: 'sora',
      woofCost: SORA_WOOF_FACTOR,
      reason: `Style ${normalizedStyle} → Sora privilégié (format court)`,
    };
  }

  if (isLongForm) {
    return {
      engine: 'sora',
      woofCost: SORA_WOOF_FACTOR,
      reason: `Durée ${duration}s mais routage Sora (préférence budget Woofs)`,
    };
  }

  return {
    engine: 'sora',
    woofCost: SORA_WOOF_FACTOR,
    reason: 'Sora 2 via Kie AI (par défaut ≤10s)',
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