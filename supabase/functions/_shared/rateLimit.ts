import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
  if (forwarded) {
    const candidate = forwarded.split(",")[0]?.trim();
    if (candidate) return candidate;
  }
  const remoteAddr = req.headers.get("cf-connecting-ip") || req.headers.get("true-client-ip");
  if (remoteAddr) return remoteAddr;
  return "unknown";
}

export async function enforceRateLimit(
  supabase: SupabaseClient,
  ip: string,
  endpoint: string,
  limitPerMinute = 20,
) {
  const now = new Date();
  const windowStart = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    0,
    0,
    0,
  );

  const { data, error } = await supabase
    .from("http_rate_limits")
    .select("id, count")
    .eq("ip_address", ip)
    .eq("endpoint", endpoint)
    .eq("window_start", windowStart.toISOString())
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (!data) {
    const { error: insertError } = await supabase.from("http_rate_limits").insert({
      ip_address: ip,
      endpoint,
      window_start: windowStart.toISOString(),
      count: 1,
    });
    if (insertError) throw insertError;
    return;
  }

  if (data.count >= limitPerMinute) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  const { error: updateError } = await supabase
    .from("http_rate_limits")
    .update({ count: data.count + 1 })
    .eq("id", data.id);

  if (updateError) {
    throw updateError;
  }
}
