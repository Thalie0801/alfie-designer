// Gestionnaire de quotas mensuels (visuels, vidéos, Woofs)

import { supabase } from '@/integrations/supabase/client';

export interface QuotaStatus {
  visuals: {
    used: number;
    limit: number;
    percentage: number;
    canGenerate: boolean;
  };
  videos: {
    used: number;
    limit: number;
    percentage: number;
    canGenerate: boolean;
  };
  woofs: {
    consumed: number;
    limit: number; // équivalent au quota vidéos
    remaining: number;
    canUse: (cost: number) => boolean;
  };
}

/**
 * Récupère le statut des quotas pour l'utilisateur
 */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('generations_this_month, quota_visuals_per_month, videos_this_month, quota_videos, woofs_consumed_this_month')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!profile) return null;

    const visualsUsed = profile.generations_this_month || 0;
    const visualsLimit = profile.quota_visuals_per_month || 0;
    const visualsPercentage = visualsLimit > 0 ? (visualsUsed / visualsLimit) * 100 : 0;

    const videosUsed = profile.videos_this_month || 0;
    const videosLimit = profile.quota_videos || 0;
    const videosPercentage = videosLimit > 0 ? (videosUsed / videosLimit) * 100 : 0;

    const woofsConsumed = profile.woofs_consumed_this_month || 0;
    const woofsLimit = videosLimit; // 1 vidéo = minimum 1 Woof
    const woofsRemaining = Math.max(0, woofsLimit - woofsConsumed);

    return {
      visuals: {
        used: visualsUsed,
        limit: visualsLimit,
        percentage: visualsPercentage,
        canGenerate: visualsPercentage < 110 // Hard-stop à 110%
      },
      videos: {
        used: videosUsed,
        limit: videosLimit,
        percentage: videosPercentage,
        canGenerate: videosPercentage < 110 // Hard-stop à 110%
      },
      woofs: {
        consumed: woofsConsumed,
        limit: woofsLimit,
        remaining: woofsRemaining,
        canUse: (cost: number) => woofsRemaining >= cost
      }
    };
  } catch (error) {
    console.error('Error fetching quota status:', error);
    return null;
  }
}

/**
 * Consomme des quotas (visuels et/ou vidéos + Woofs)
 */
export async function consumeQuota(
  userId: string, 
  type: 'visual' | 'video',
  woofCost?: number
): Promise<boolean> {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('generations_this_month, videos_this_month, woofs_consumed_this_month')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const updates: any = {};

    if (type === 'visual') {
      updates.generations_this_month = (profile.generations_this_month || 0) + 1;
    }

    if (type === 'video' && woofCost !== undefined) {
      updates.videos_this_month = (profile.videos_this_month || 0) + 1;
      updates.woofs_consumed_this_month = (profile.woofs_consumed_this_month || 0) + woofCost;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error consuming quota:', error);
    return false;
  }
}

/**
 * Vérifie si l'utilisateur peut générer (avant de lancer)
 */
export async function canGenerateVisual(userId: string): Promise<{ canGenerate: boolean; reason?: string }> {
  const status = await getQuotaStatus(userId);
  
  if (!status) {
    return { canGenerate: false, reason: 'Impossible de récupérer les quotas' };
  }

  if (!status.visuals.canGenerate) {
    return { 
      canGenerate: false, 
      reason: `Quota visuels atteint (${status.visuals.used}/${status.visuals.limit}). Upgrade ton plan ou attends le reset mensuel !` 
    };
  }

  return { canGenerate: true };
}

/**
 * Vérifie si l'utilisateur peut générer une vidéo (avec coût Woofs)
 */
export async function canGenerateVideo(
  userId: string, 
  woofCost: number
): Promise<{ canGenerate: boolean; reason?: string }> {
  const status = await getQuotaStatus(userId);
  
  if (!status) {
    return { canGenerate: false, reason: 'Impossible de récupérer les quotas' };
  }

  if (!status.videos.canGenerate) {
    return { 
      canGenerate: false, 
      reason: `Quota vidéos atteint (${status.videos.used}/${status.videos.limit}). Upgrade ton plan pour continuer !` 
    };
  }

  if (!status.woofs.canUse(woofCost)) {
    return { 
      canGenerate: false, 
      reason: `Woofs insuffisants (${status.woofs.remaining} restants, ${woofCost} requis). Achète un Pack Woofs ou upgrade ton plan !` 
    };
  }

  return { canGenerate: true };
}