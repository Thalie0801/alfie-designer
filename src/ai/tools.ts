import type { AlfieIntent } from "./intent";

export type EnqueueJobArgs = { intent: AlfieIntent };
export type EnqueueJobResult = { orderId: string; jobId: string };

export type AssetRow = {
  id: string;
  brand_id: string;
  order_id: string | null;
  preview_url: string | null;
  download_url: string | null;
  status: "queued" | "processing" | "done" | "error";
  error_message?: string | null;
  created_at?: string;
};

export type SearchAssetsArgs = { brandId: string; orderId?: string };

export async function enqueue_job({ intent }: EnqueueJobArgs): Promise<EnqueueJobResult> {
  const res = await fetch("/functions/v1/alfie-enqueue-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "enqueue_job failed");
  }
  return (await res.json()) as EnqueueJobResult;
}

export async function search_assets(params: SearchAssetsArgs): Promise<AssetRow[]> {
  const qs = new URLSearchParams(params as Record<string, string>);
  const res = await fetch(`/functions/v1/alfie-search-assets?${qs.toString()}`);
  if (!res.ok) throw new Error("search_assets failed");
  return (await res.json()) as AssetRow[];
}

export function studioLink(orderId?: string) {
  const base = import.meta.env.VITE_STUDIO_URL || "/studio";
  return orderId ? `${base}?order=${encodeURIComponent(orderId)}` : base;
}

export function libraryLink(brandId?: string) {
  const base = import.meta.env.VITE_LIBRARY_URL || "/library";
  return brandId ? `${base}?brand=${encodeURIComponent(brandId)}` : base;
}
