import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type DatabaseClient = SupabaseClient<Database>;

declare global {
  // eslint-disable-next-line no-var
  var __supabase__: DatabaseClient | undefined;
}

const globalForSupabase = globalThis as typeof globalThis & { __supabase__?: DatabaseClient };

function createMissingEnvProxy(): DatabaseClient {
  const error = new Error(
    "Supabase non configuré côté frontend. Définir VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY), puis republier.",
  );

  const handler: ProxyHandler<unknown> = {
    get() {
      throw error;
    },
    apply() {
      throw error;
    },
  };

  return new Proxy(() => undefined, handler) as unknown as DatabaseClient;
}

function createSupabaseClient(): DatabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return createMissingEnvProxy();
  }

  const authConfig: SupabaseClientOptions<Database>["auth"] = {
    persistSession: true,
    storageKey: "alfie-auth",
    autoRefreshToken: true,
  };

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: authConfig,
  });
}

export const supabase: DatabaseClient =
  globalForSupabase.__supabase__ ?? (globalForSupabase.__supabase__ = createSupabaseClient());
