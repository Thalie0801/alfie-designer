import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AuthDebug from '@/components/AuthDebug';

const SHOW_DEBUG = import.meta.env.VITE_SHOW_DEBUG === 'true';

export function SupabaseHealth() {
  const [session, setSession] = useState<unknown>(null);

  useEffect(() => {
    if (!SHOW_DEBUG) {
      return;
    }

    (async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession ?? null);
      } catch (err) {
        setSession(null);
      }
    })();
  }, []);

  if (!SHOW_DEBUG) {
    return null;
  }

  return <AuthDebug session={session} />;
}
