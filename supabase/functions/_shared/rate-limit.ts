import { createClient } from "jsr:@supabase/supabase-js@2";

export async function enforceRateLimit(params: {
  supabase: ReturnType<typeof createClient>;
  endpoint: string;
  clientId: string;
  limitPerMinute: number;
}) {
  const { supabase, endpoint, clientId, limitPerMinute } = params;
  const now = new Date();
  const windowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    0,
    0,
  );

  const { data, error } = await supabase
    .from("edge_rate_limits")
    .select("id, count")
    .eq("endpoint", endpoint)
    .eq("client_id", clientId)
    .eq("window_start", windowStart.toISOString())
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;

  if (!data) {
    await supabase.from("edge_rate_limits").insert({
      endpoint,
      client_id: clientId,
      window_start: windowStart.toISOString(),
      count: 1,
    });
    return;
  }

  if (data.count >= limitPerMinute) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  await supabase
    .from("edge_rate_limits")
    .update({ count: data.count + 1 })
    .eq("id", data.id);
}
