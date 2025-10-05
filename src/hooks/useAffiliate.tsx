import { useEffect, useState } from 'react';

const AFFILIATE_STORAGE_KEY = 'alfie_ref';
const AFFILIATE_EXPIRY_DAYS = 30;

interface AffiliateData {
  ref: string;
  timestamp: number;
}

export function useAffiliate() {
  const [affiliateRef, setAffiliateRef] = useState<string | null>(null);

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
      setAffiliateRef(refParam);

      // Track click (will be implemented via edge function)
      trackAffiliateClick(refParam);
      
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
          } else {
            localStorage.removeItem(AFFILIATE_STORAGE_KEY);
          }
        } catch (e) {
          localStorage.removeItem(AFFILIATE_STORAGE_KEY);
        }
      }
    }
  }, []);

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
      // Track via navigator.sendBeacon for reliability
      const data = new URLSearchParams({
        ref,
        timestamp: Date.now().toString(),
        page: window.location.pathname
      });
      
      // This will be caught by an edge function
      navigator.sendBeacon('/api/track-affiliate-click', data);
    } catch (error) {
      console.error('Failed to track affiliate click:', error);
    }
  };

  return {
    affiliateRef,
    getAffiliateRef
  };
}
