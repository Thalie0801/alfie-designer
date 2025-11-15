import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSignedMediaUrl } from '@/lib/storageUrls';

export interface CarouselItem {
  id: string;
  url: string;
  index: number;
}

async function resolveAssetUrl(storageKey: string, fallback?: string | null) {
  const bucket = 'media-generations';
  const normalized = storageKey.startsWith(`${bucket}/`)
    ? storageKey.slice(bucket.length + 1)
    : storageKey;
  const signed = await getSignedMediaUrl(bucket, normalized, fallback);
  return signed ?? fallback ?? '';
}

export function useCarouselSubscription(jobSetId: string, total: number) {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [done, setDone] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 🔄 RÉINITIALISER quand jobSetId change
  useEffect(() => {
    console.log('[Carousel] jobSetId changed:', jobSetId);
    setItems([]);
    setDone(0);
  }, [jobSetId]);

  // 1️⃣ Fonction de chargement des assets existants (extractée pour être réutilisable)
  const loadExistingAssets = useCallback(async () => {
    if (!jobSetId) return;
    
    // Defensive: join job_sets to ensure we only see assets from our brands
    const { data, error } = await supabase
      .from('assets')
      .select(`
        id, 
        storage_key, 
        index_in_set, 
        meta,
        job_sets!inner(brand_id)
      `)
      .eq('job_set_id', jobSetId)
      .order('index_in_set', { ascending: true });

    if (error) {
      console.error('[Carousel] Failed to load existing assets:', error);
      return;
    }

    if (data && data.length > 0) {
      const mapped: CarouselItem[] = await Promise.all(
        data.map(async (row) => {
          const meta = row.meta as { public_url?: string } | null;
          const url = await resolveAssetUrl(row.storage_key, meta?.public_url || undefined);
          return {
            id: row.id,
            index: row.index_in_set ?? 0,
            url,
          };
        }),
      );
      setItems(mapped);
      setDone(mapped.length);
    }
  }, [jobSetId]);

  useEffect(() => {
    console.log('[useCarouselSubscription] Hook triggered with jobSetId:', jobSetId);
    
    if (!jobSetId) {
      console.log('[useCarouselSubscription] No jobSetId, skipping');
      return;
    }

    // Charger les assets existants au montage
    console.log('[useCarouselSubscription] Loading existing assets...');
    loadExistingAssets();

    // 2️⃣ S'abonner au Realtime
    const channel = supabase
      .channel(`jobset:${jobSetId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assets',
          filter: `job_set_id=eq.${jobSetId}`
        },
        (payload: any) => {
          console.log('[useCarouselSubscription] New asset received:', payload.new);
          
          const newAsset = payload.new;
          const meta = newAsset.meta as { public_url?: string } | null;
          void (async () => {
            const signedUrl = await resolveAssetUrl(
              newAsset.storage_key,
              meta?.public_url || undefined,
            );
            const newItem: CarouselItem = {
              id: newAsset.id,
              index: newAsset.index_in_set ?? 0,
              url: signedUrl,
            };

            setItems(prev => {
              if (prev.some(p => p.id === newItem.id)) {
                console.log('[useCarouselSubscription] Duplicate asset, skipping:', newItem.id);
                return prev;
              }

              const next = [...prev, newItem].sort((a, b) => a.index - b.index);
              setDone(next.length);
              console.log('[useCarouselSubscription] Asset added, total:', next.length);
              return next;
            });
          })();
        }
      )
      .subscribe((status) => {
        console.log('[useCarouselSubscription] Realtime channel status:', status);
      });

    channelRef.current = channel;

    // 3️⃣ Polling fallback (every 2s for 2 minutes)
    let pollCount = 0;
    const maxPolls = 60; // 2 minutes (60 × 2s)
    
    const pollingInterval = setInterval(async () => {
      pollCount++;
      
      // Stop polling if we've reached the total or max time
      if (pollCount >= maxPolls || done >= total) {
        clearInterval(pollingInterval);
        return;
      }
      
      console.log(`[Carousel] Polling fallback (${pollCount}/${maxPolls})...`);
      await loadExistingAssets();
    }, 2000);

    // 4️⃣ Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      clearInterval(pollingInterval);
    };
  }, [jobSetId, loadExistingAssets, done, total]);

  return { items, done, total, refresh: loadExistingAssets };
}
