import { Buffer } from 'node:buffer';
import type { IncomingMessage, ServerResponse } from 'node:http';

import prisma from '../../lib/db';
import { resolveAspectDimensions } from '../../lib/aspects';
import { urlAllowed, verifyHmacSHA256 } from '../../lib/webhook';
import { videoJobWebhookSchema } from '../../lib/validation';

type AlfieRequest = IncomingMessage & {
  body?: unknown;
};

type JsonBody = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

function getHeader(req: AlfieRequest, name: string): string | null {
  const header = req.headers[name.toLowerCase()];

  if (!header) {
    return null;
  }

  return Array.isArray(header) ? header[0] ?? null : header;
}

function writeJson(res: ServerResponse, status: number, body: JsonBody): void {
  const payload = JSON.stringify(body ?? {});
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(payload).toString());
  res.end(payload);
}

async function readRawBody(req: AlfieRequest): Promise<string> {
  if (typeof req.body === 'string') {
    return req.body;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }

  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }

  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }

  if (chunks.length === 0) {
    return '';
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function ensureWebhookVerified(req: AlfieRequest, rawBody: string, secret: string): Promise<boolean> {
  try {
    return verifyHmacSHA256(rawBody, getHeader(req, 'x-alfie-signature'), secret);
  } catch (error) {
    console.error('Webhook signature verification failed', error);
    throw new Error('Webhook verification failed');
  }
}

export default async function handler(req: AlfieRequest, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    writeJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const secret = process.env.VIDEO_WEBHOOK_SECRET;

  if (!secret) {
    writeJson(res, 500, { error: 'VIDEO_WEBHOOK_SECRET is not configured' });
    return;
  }

  let rawBody: string;

  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    console.error('Failed to read webhook body', error);
    writeJson(res, 400, { error: 'Invalid request body' });
    return;
  }

  let signatureValid = false;

  try {
    signatureValid = await ensureWebhookVerified(req, rawBody, secret);
  } catch (error) {
    writeJson(res, 500, { error: (error as Error).message });
    return;
  }

  if (!signatureValid) {
    writeJson(res, 401, { error: 'Invalid webhook signature' });
    return;
  }

  let parsedBody: unknown;

  try {
    parsedBody = rawBody.length > 0 ? JSON.parse(rawBody) : {};
  } catch (error) {
    console.error('Webhook JSON parse error', error);
    writeJson(res, 400, { error: 'Invalid JSON payload' });
    return;
  }

  const validation = videoJobWebhookSchema.safeParse(parsedBody);

  if (!validation.success) {
    writeJson(res, 400, { error: validation.error.message });
    return;
  }

  const data = validation.data;

  try {
    const generationLog = await prisma.generationLog.findUnique({
      where: { id: data.jobId },
    });

    if (!generationLog) {
      writeJson(res, 404, { error: 'Generation log not found' });
      return;
    }

    if (generationLog.status === 'succeeded') {
      writeJson(res, 200, { success: true, assetId: generationLog.assetId, note: 'already_succeeded' });
      return;
    }

    if (generationLog.status === 'failed') {
      writeJson(res, 200, { success: true, note: 'already_failed' });
      return;
    }

    if (data.status === 'queued') {
      await prisma.generationLog.update({
        where: { id: generationLog.id },
        data: {
          status: 'queued',
          durationMs: data.durationMs ?? generationLog.durationMs,
        },
      });

      writeJson(res, 200, { success: true, note: 'queued' });
      return;
    }

    if (data.status === 'succeeded') {
      if (!data.url) {
        writeJson(res, 400, { error: 'Missing asset URL for completed job' });
        return;
      }

      const allowedPrefixes = process.env.ALLOWED_ASSET_URL_PREFIXES;

      if (!urlAllowed(data.url, allowedPrefixes)) {
        writeJson(res, 400, { error: 'Asset URL is not allowed' });
        return;
      }

      if (data.thumbUrl && !urlAllowed(data.thumbUrl, allowedPrefixes)) {
        writeJson(res, 400, { error: 'Thumbnail URL is not allowed' });
        return;
      }

      const dimensions = resolveAspectDimensions(generationLog.aspect);

      const asset = await prisma.$transaction(async (tx) => {
        const createdAsset = await tx.asset.create({
          data: {
            projectId: generationLog.projectId,
            mediaType: 'video',
            aspect: generationLog.aspect,
            url: data.url,
            thumbUrl: data.thumbUrl ?? null,
            prompt: generationLog.prompt ?? `Video generation job ${generationLog.id}`,
            width: dimensions.width,
            height: dimensions.height,
          },
        });

        await tx.generationLog.update({
          where: { id: generationLog.id },
          data: {
            status: 'succeeded',
            durationMs: data.durationMs ?? generationLog.durationMs,
            assetId: createdAsset.id,
          },
        });

        return createdAsset;
      });

      writeJson(res, 200, { success: true, assetId: asset.id });
      return;
    }

    await prisma.generationLog.update({
      where: { id: generationLog.id },
      data: {
        status: 'failed',
        durationMs: data.durationMs ?? generationLog.durationMs,
      },
    });

    writeJson(res, 200, { success: true });
  } catch (error) {
    console.error('Video webhook processing failed', error);
    writeJson(res, 500, { error: 'Internal server error' });
  }
}
