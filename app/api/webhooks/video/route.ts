import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveAspectDimensions } from '@/lib/aspects';
import { videoJobWebhookSchema } from '@/lib/validation';
import { urlAllowed, verifyHmacSHA256 } from '@/lib/webhook';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = process.env.VIDEO_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'VIDEO_WEBHOOK_SECRET is not configured' }, { status: 500 });
  }

  const rawBody = await request.text();

  let isValidSignature = false;

  try {
    isValidSignature = verifyHmacSHA256(rawBody, request.headers.get('x-alfie-signature'), secret);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to verify webhook signature' }, { status: 500 });
  }

  if (!isValidSignature) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = videoJobWebhookSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const data = parsed.data;

  const log = await prisma.generationLog.findUnique({
    where: { id: data.jobId },
  });

  if (!log) {
    return NextResponse.json({ error: 'Generation log not found' }, { status: 404 });
  }

  if (log.status === 'succeeded') {
    return NextResponse.json({ success: true, assetId: log.assetId, note: 'already_succeeded' });
  }

  if (log.status === 'failed') {
    return NextResponse.json({ success: true, note: 'already_failed' });
  }

  if (data.status === 'queued') {
    await prisma.generationLog.update({
      where: { id: log.id },
      data: {
        status: 'queued',
        durationMs: data.durationMs ?? log.durationMs,
      },
    });

    return NextResponse.json({ success: true, note: 'queued' });
  }

  if (data.status === 'succeeded') {
    if (!data.url) {
      return NextResponse.json({ error: 'Missing asset URL for completed job' }, { status: 400 });
    }

    const allowlist = process.env.ALLOWED_ASSET_URL_PREFIXES;

    if (!urlAllowed(data.url, allowlist) || (data.thumbUrl && !urlAllowed(data.thumbUrl, allowlist))) {
      return NextResponse.json({ error: 'Asset URL is not allowed' }, { status: 403 });
    }

    const { width, height } = resolveAspectDimensions(log.aspect);

    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          projectId: log.projectId,
          mediaType: 'video',
          aspect: log.aspect,
          url: data.url,
          thumbUrl: data.thumbUrl ?? null,
          prompt: log.prompt ?? `Video generation job ${log.id}`,
          width,
          height,
        },
      });

      await tx.generationLog.update({
        where: { id: log.id },
        data: {
          status: 'succeeded',
          durationMs: data.durationMs ?? log.durationMs,
          assetId: asset.id,
        },
      });

      return { assetId: asset.id };
    });

    return NextResponse.json({ success: true, assetId: result.assetId });
  }

  await prisma.generationLog.update({
    where: { id: log.id },
    data: {
      status: 'failed',
      durationMs: data.durationMs ?? log.durationMs,
    },
  });

  return NextResponse.json({ success: true });
}
