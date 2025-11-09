import { supabase } from '@/lib/supabaseSafeClient';

type GenerationResponse = {
  ok: boolean;
  order_id: string;
  job_id: string;
};

type ProcessJobWorkerResponse = {
  ok?: boolean;
  processed?: number;
};

export async function createGeneration(brandId: string, payload: unknown) {
  const { data, error } = await supabase.functions.invoke('alfie-generate', {
    body: { brand_id: brandId, payload },
  });
  if (error) throw new Error(error.message);
  return data as GenerationResponse;
}

type SupabaseFunctionError = Error & {
  context?: { status?: number } | null;
  status?: number;
};

type WorkerError = Error & { status?: number; originalError?: unknown };

export async function forceProcess() {
  const { data, error } = await supabase.functions.invoke('process-job-worker', {
    body: { source: 'studio-force' },
  });

  if (error) {
    const httpError = error as SupabaseFunctionError;
    const status =
      typeof httpError.context?.status === 'number'
        ? httpError.context.status
        : typeof httpError.status === 'number'
          ? httpError.status
          : undefined;

    const baseMessage = httpError.message ?? String(error);
    const message =
      status === 409
        ? 'Un traitement est déjà en cours.'
        : `process-job-worker: ${baseMessage}`;

    const wrappedError = new Error(message) as WorkerError;
    if (status !== undefined) {
      wrappedError.status = status;
    }
    wrappedError.originalError = error as unknown;

    throw wrappedError;
  }

  return data as ProcessJobWorkerResponse | undefined;
}
