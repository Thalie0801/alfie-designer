// Configuration système pour quotas et retention
// Ces valeurs peuvent être ajustées par l'admin

// Feature flags (produit)
export const FEATURE_FLAGS = {
  VEO3_ENABLED: false,
  CANVA_API_ENABLED: false,
  VIDEO_GENERATION_ENABLED: false, // Désactivé: problème IP whitelist Kie.ai
} as const;

export const SYSTEM_CONFIG = {
  // Coûts vidéo en Woofs
  VEO3_WOOF_FACTOR: 4,
  SORA_WOOF_FACTOR: 1,

  // Vidéo (qualité/latence)
  VIDEO: {
    SORA_CLIP_MAX_SEC: 12,
    SORA_MONTAGE_MAX_CLIPS: 3,
  },
  
  // Quotas et alertes
  HARD_STOP_MULTIPLIER: 1.10, // 110% du quota
  ALERT_THRESHOLD: 0.80, // Alerte à 80%
  
  // Modèle de comptage (consommation)
  COUNT_MODEL: {
    video_output_consumes: 1,     // 1 vidéo finale = 1 vidéo consommée
    sora_clip_consumes_woof: 1,   // 1 clip Sora = 1 Woof
  },
  
  // Rétention et reset
  ASSET_RETENTION_DAYS: 30,
  RESET_DAY_OF_MONTH: 1, // 1er du mois
  
  // Add-ons disponibles
  PACK_WOOFS_SIZES: [50, 100],
  
  // Logs et conformité
  PROMPT_MAX_LOG_LENGTH: 100, // Limite de log des prompts (RGPD)
  LOG_RETENTION_DAYS: 30,
  
  // Pricing par marque (EUR/mois)
  PRICING: {
    STARTER: 39,
    PRO: 99,
    STUDIO: 199,
    ADDON_BRAND: 39, // Coût pour ajouter une marque
  },
  
  // Différentiels d'upgrade
  UPGRADE_DIFF: {
    starter_to_pro: 60,    // 99 - 39
    starter_to_studio: 160, // 199 - 39
    pro_to_studio: 100,     // 199 - 99
  },
  
  // Quotas par tier
  QUOTAS: {
    starter: {
      images: 150,
      videos: 15,
      woofs: 15,
    },
    pro: {
      images: 450,
      videos: 45,
      woofs: 45,
    },
    studio: {
      images: 1000,
      videos: 100,
      woofs: 100,
    },
  },
} as const;

// Type-safe config access
export type SystemConfig = typeof SYSTEM_CONFIG;

/**
 * Vérifie si un asset doit être purgé
 */
export function shouldPurgeAsset(expiresAt: string): boolean {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  return now >= expiryDate;
}

/**
 * Calcule la date d'expiration d'un nouvel asset
 */
export function calculateExpirationDate(): Date {
  const now = new Date();
  const expirationDate = new Date(now);
  expirationDate.setDate(now.getDate() + SYSTEM_CONFIG.ASSET_RETENTION_DAYS);
  return expirationDate;
}

/**
 * Calcule la prochaine date de reset des quotas
 */
export function calculateNextResetDate(): Date {
  const now = new Date();
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, SYSTEM_CONFIG.RESET_DAY_OF_MONTH);
  return nextReset;
}

/**
 * Tronque un prompt pour les logs (conformité RGPD)
 */
export function truncatePromptForLog(prompt: string): string {
  if (prompt.length <= SYSTEM_CONFIG.PROMPT_MAX_LOG_LENGTH) {
    return prompt;
  }
  return prompt.substring(0, SYSTEM_CONFIG.PROMPT_MAX_LOG_LENGTH) + '...';
}
