import { supabase } from '@/lib/supabaseSafeClient';

export async function createGeneration(brandId: string, payload: any) {
  const isVideo = payload?.type === 'video';
  const job = {
    type: isVideo ? 'generate-video' : 'generate-image',
    format: payload?.format ?? payload?.aspect_ratio ?? '1:1',
    prompt: payload?.prompt ?? 'visuel',
    duration: payload?.duration ?? payload?.durationSec ?? undefined,
    aspect_ratio: payload?.aspect_ratio,
    reference: payload?.reference ?? null,
    payload,
  };

  const { data, error } = await supabase.functions.invoke('alfie-orchestrator', {
    body: {
      action: 'create_generation',
      brand_id: brandId,
      job,
      forceTool: isVideo ? 'generate_video' : 'generate_image',
      prompt: payload?.prompt,
      uploadedSourceUrl: payload?.reference?.url ?? null,
      aspectRatio: payload?.aspect_ratio,
      durationSec: payload?.duration ?? payload?.durationSec,
    },
  });
  if (error) throw new Error(`alfie-orchestrator: ${error.message}`);
  return data;
type GenerationResponse = {
  ok: boolean;
  order_id: string;
  job_id: string;
};

type ProcessJobWorkerResponse = {
  ok?: boolean;
  processed?: number;
type ProcessQueueResponse = {
  ok: boolean;
  processed: number;
};

export async function createGeneration(brandId: string, payload: any) {
  const { data, error } = await supabase.functions.invoke('alfie-generate', {
    body: { brand_id: brandId, payload },
  });
  if (error) throw new Error(error.message);
  return data as GenerationResponse;
}

export async function forceProcess() {
  const { data, error } = await supabase.functions.invoke('process-job-worker', {
    body: { source: 'studio-force' },
  });
  if (error) throw new Error(`process-job-worker: ${error.message}`);
  return data as { processed?: number };
  if (error) {
    throw new Error(`process-job-worker: ${error.message}`);
  }
  return data as ProcessJobWorkerResponse | unknown;
  const { data, error } = await supabase.functions.invoke('alfie-process-queue', {
    body: {},
  });
  if (error) throw new Error(error.message);
  return data as ProcessQueueResponse;
}
