export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
export const INTERNAL_FN_SECRET = Deno.env.get('INTERNAL_FN_SECRET') ?? '';
export const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? '';
export const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

export function env(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = Deno.env.get(key);
    if (value && value.trim()) {
      return value;
    }
  }
  return undefined;
}
