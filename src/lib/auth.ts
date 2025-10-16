import { supabase } from '@/integrations/supabase/client';

/**
 * Returns a proper Authorization header for Supabase Edge Functions.
 * - If a user is signed in, returns the user's JWT access token
 * - Otherwise falls back to the public anon key
 */
export async function getAuthHeader(): Promise<{ Authorization: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userToken = session?.access_token;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (userToken) {
    return { Authorization: `Bearer ${userToken}` };
  }
  if (anon) {
    return { Authorization: `Bearer ${anon}` };
  }

  throw new Error(
    'Missing auth token: no session token and VITE_SUPABASE_ANON_KEY is undefined',
  );
}
