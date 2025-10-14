'use client';

import { useState } from 'react';

type AR = '1:1' | '9:16' | '16:9' | '3:4';

type GenerateOptions = {
  prompt: string;
  aspectRatio?: AR;
  count?: number;
  seed?: number;
};

export function useGeminiImages() {
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = async (
    promptOrOptions: string | GenerateOptions,
    aspectRatio?: AR,
    count = 1,
    seed?: number
  ) => {
    const options: GenerateOptions =
      typeof promptOrOptions === 'string'
        ? { prompt: promptOrOptions, aspectRatio, count, seed }
        : promptOrOptions;

    setLoading(true);
    setError(null);
    setUrls([]);

    try {
      const body = {
        prompt: options.prompt,
        aspectRatio: options.aspectRatio ?? '1:1',
        count: Math.max(1, Math.min(options.count ?? 1, 4)),
        seed: options.seed,
      };

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setUrls(data.urls || []);
      return (data.urls as string[]) ?? [];
    } catch (e: any) {
      setError(e?.message || 'Erreur génération');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { loading, urls, error, generate };
}
