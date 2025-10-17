import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function SupabaseHealth() {
  const [envOk, setEnvOk] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnvOk(Boolean(import.meta.env.VITE_SUPABASE_URL && (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)));

    (async () => {
      try {
        await supabase.auth.getSession();
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error');
        }
      }
    })();
  }, []);

  if (envOk && !error) {
    return null;
  }

  return (
    <div
      style={{
        fontFamily: 'monospace',
        padding: 12,
        border: '1px solid #ddd',
        borderRadius: 8,
        marginTop: 16,
        background: '#fff8f8',
      }}
    >
      {!envOk && <div>Configuration Supabase incomplète (URL ou clef manquante).</div>}
      {error && <div style={{ color: 'crimson' }}>Erreur Supabase : {error}</div>}
    </div>
  );
}
