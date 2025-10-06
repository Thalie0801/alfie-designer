import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AFFILIATE_STORAGE_KEY = 'alfie_ref';
const AFFILIATE_EXPIRY_DAYS = 30;
const AFFILIATE_TOAST_SHOWN = 'alfie_ref_toast_shown';

interface AffiliateData {
  ref: string;
  timestamp: number;
}

export function useAffiliate() {
  const [affiliateRef, setAffiliateRef] = useState<string | null>(null);
  const [affiliateName, setAffiliateName] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check URL for ref parameter
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');

    if (refParam) {
      // Store affiliate ref with timestamp
      const affiliateData: AffiliateData = {
        ref: refParam,
        timestamp: Date.now()
      };
      localStorage.setItem(AFFILIATE_STORAGE_KEY, JSON.stringify(affiliateData));
      localStorage.removeItem(AFFILIATE_TOAST_SHOWN); // Reset toast flag for new ref
      setAffiliateRef(refParam);

      // Track click (will be implemented via edge function)
      trackAffiliateClick(refParam);
      
      // Show welcome toast and load affiliate name
      loadAffiliateInfo(refParam);
      
      // Clean URL
      urlParams.delete('ref');
      const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    } else {
      // Check if we have a stored ref
      const stored = localStorage.getItem(AFFILIATE_STORAGE_KEY);
      if (stored) {
        try {
          const data: AffiliateData = JSON.parse(stored);
          const daysSinceStored = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
          
          if (daysSinceStored < AFFILIATE_EXPIRY_DAYS) {
            setAffiliateRef(data.ref);
            // Load affiliate name from storage or fetch it
            loadAffiliateInfo(data.ref);
          } else {
            localStorage.removeItem(AFFILIATE_STORAGE_KEY);
            localStorage.removeItem(AFFILIATE_TOAST_SHOWN);
          }
        } catch (e) {
          localStorage.removeItem(AFFILIATE_STORAGE_KEY);
          localStorage.removeItem(AFFILIATE_TOAST_SHOWN);
        }
      }
    }
  }, []);

  const loadAffiliateInfo = async (ref: string) => {
    try {
      // Fetch affiliate info from database
      const { data: affiliate, error } = await supabase
        .from('affiliates')
        .select('name, email')
        .eq('id', ref)
        .single();

      if (error || !affiliate) {
        console.error('Failed to fetch affiliate info:', error);
        return;
      }

      const name = affiliate.name || affiliate.email.split('@')[0];
      setAffiliateName(name);

      // Show toast only once per ref
      const toastShown = localStorage.getItem(AFFILIATE_TOAST_SHOWN);
      if (toastShown !== ref) {
        toast({
          title: `🎉 ${name} vous invite !`,
          description: "Profitez d'Alfie Designer recommandé par quelqu'un de confiance.",
          duration: 10000,
        });
        localStorage.setItem(AFFILIATE_TOAST_SHOWN, ref);
      }
    } catch (error) {
      console.error('Error loading affiliate info:', error);
    }
  };

  const getAffiliateRef = () => {
    const stored = localStorage.getItem(AFFILIATE_STORAGE_KEY);
    if (!stored) return null;
    
    try {
      const data: AffiliateData = JSON.parse(stored);
      const daysSinceStored = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
      
      if (daysSinceStored < AFFILIATE_EXPIRY_DAYS) {
        return data.ref;
      }
      localStorage.removeItem(AFFILIATE_STORAGE_KEY);
      return null;
    } catch (e) {
      return null;
    }
  };

  const trackAffiliateClick = async (ref: string) => {
    try {
      console.log('[Affiliate] Tracking click for ref:', ref);
      const url = new URL(window.location.href);
      const utm_source = url.searchParams.get('utm_source') || undefined;
      const utm_medium = url.searchParams.get('utm_medium') || undefined;
      const utm_campaign = url.searchParams.get('utm_campaign') || undefined;

      const { data, error } = await supabase.functions.invoke('track-affiliate-click', {
        body: {
          ref,
          utm_source,
          utm_medium,
          utm_campaign,
        },
      });

      if (error) {
        console.error('[Affiliate] Track error:', error);
      } else {
        console.log('[Affiliate] Click tracked successfully:', data);
      }
    } catch (error) {
      console.error('[Affiliate] Failed to track click:', error);
    }
  };

  return {
    affiliateRef,
    affiliateName,
    getAffiliateRef
  };
}
