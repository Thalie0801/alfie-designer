import { z } from 'zod';

export const aspectRatioSchema = z.enum(['1:1', '3:4', '4:3', '9:16', '16:9']);

export const generateImageSchema = z.object({
  prompt: z.string().min(1).max(1024),
  aspect: aspectRatioSchema,
  count: z.number().int().min(1).max(4).optional(),
  projectId: z.string().min(1),
});

export const generateVideoSchema = z.object({
  prompt: z.string().min(1).max(1024),
  aspect: aspectRatioSchema,
  projectId: z.string().min(1),
});

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(120),
});

export const assetListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .transform((value) => ({
    page: value.page ?? 1,
    limit: value.limit ?? 20,
  }));

export const creditAdjustmentSchema = z.object({
  delta: z.number().int(),
  reason: z.string().min(1).max(255),
});

export const videoJobWebhookSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(['queued', 'succeeded', 'failed']),
  url: z.string().url().optional(),
  thumbUrl: z.string().url().optional(),
  durationMs: z.number().int().positive().optional(),
});
