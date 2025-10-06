import { useState, useEffect } from 'react';

export interface BrandKit {
  palette: string[];
  logo_url?: string;
  fonts?: {
    primary?: string;
    secondary?: string;
  };
  voice?: string;
}

const BRAND_KIT_KEY = 'alfie_brand_kit';

export function useBrandKit() {
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrandKit();
  }, []);

  const loadBrandKit = () => {
    try {
      const stored = localStorage.getItem(BRAND_KIT_KEY);
      if (stored) {
        setBrandKit(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading brand kit:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBrandKit = (updates: Partial<BrandKit>) => {
    const newBrandKit = { ...brandKit, ...updates } as BrandKit;
    localStorage.setItem(BRAND_KIT_KEY, JSON.stringify(newBrandKit));
    setBrandKit(newBrandKit);
    return newBrandKit;
  };

  const clearBrandKit = () => {
    localStorage.removeItem(BRAND_KIT_KEY);
    setBrandKit(null);
  };

  return {
    brandKit,
    loading,
    updateBrandKit,
    clearBrandKit,
    hasBrandKit: !!brandKit
  };
}
