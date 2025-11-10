import { createClient } from "@supabase/supabase-js";
import type { DesignBrief } from "./designBrief";

export type EnqueueJobArgs = { brief: DesignBrief };

export type EnqueueJobResult = {
  orderId: string;
  jobId: string;
  queueSize?: number;
};

export type SearchAssetsArgs = {
  brandId: string;
  orderId?: string;
};

export type LibraryAsset = {
  id: string;
  orderId: string | null;
  type?: string | null;
  preview_url?: string | null;
  download_url?: string | null;
  cloudinary_url?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SearchAssetsResult = {
  assets: LibraryAsset[];
};

type EnvSource = Record<string, unknown> | undefined;

function readEnv(key: string, env?: EnvSource): string | undefined {
  if (env && typeof env[key] === "string") {
    return env[key] as string;
  }
  if (typeof process !== "undefined" && process.env && typeof process.env[key] === "string") {
    return process.env[key] as string;
  }
  if (typeof import.meta !== "undefined" && (import.meta as any)?.env && typeof (import.meta as any).env[key] === "string") {
    return (import.meta as any).env[key] as string;
  }
  return undefined;
}

function createSupabaseClient(env?: EnvSource) {
  const url = readEnv("SUPABASE_URL", env) ?? readEnv("VITE_SUPABASE_URL", env);
  const key =
    readEnv("SUPABASE_SERVICE_ROLE_KEY", env) ??
    readEnv("SUPABASE_ANON_KEY", env) ??
    readEnv("VITE_SUPABASE_PUBLISHABLE_KEY", env);

  if (!url || !key) {
    throw new Error("Supabase non configuré pour les outils Alfie");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function enqueueJob({ brief }: EnqueueJobArgs, env?: EnvSource): Promise<EnqueueJobResult> {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase.functions.invoke("enqueue_job", {
    body: { brief },
  });

  if (error) {
    throw new Error(error.message ?? "Échec de enqueue_job");
  }

  const payload = (data as Partial<EnqueueJobResult>) ?? {};
  if (!payload.orderId || !payload.jobId) {
    throw new Error("Réponse enqueue_job incomplète");
  }

  return {
    orderId: payload.orderId,
    jobId: payload.jobId,
    queueSize: payload.queueSize,
  };
}

export async function searchAssets(
  params: SearchAssetsArgs,
  env?: EnvSource,
): Promise<SearchAssetsResult> {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase.functions.invoke("search_assets", {
    body: params,
  });

  if (error) {
    throw new Error(error.message ?? "Échec de search_assets");
  }

  const payload = (data as SearchAssetsResult) ?? { assets: [] };
  return {
    assets: Array.isArray(payload.assets) ? payload.assets : [],
  };
}
