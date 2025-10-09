// Configuration système pour quotas et retention
// Ces valeurs peuvent être ajustées par l'admin

export const SYSTEM_CONFIG = {
  // Coûts vidéo en Woofs
  VEO3_WOOF_FACTOR: 4,
  SORA_WOOF_FACTOR: 1,
  
  // Quotas et alertes
  HARD_STOP_MULTIPLIER: 1.10, // 110% du quota
  ALERT_THRESHOLD: 0.80, // Alerte à 80%
  
  // Rétention et reset
  ASSET_RETENTION_DAYS: 30,
  RESET_DAY_OF_MONTH: 1, // 1er du mois
  
  // Add-ons disponibles
  PACK_WOOFS_SIZES: [50, 100],
  
  // Logs et conformité
  PROMPT_MAX_LOG_LENGTH: 100, // Limite de log des prompts (RGPD)
  LOG_RETENTION_DAYS: 30,
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
