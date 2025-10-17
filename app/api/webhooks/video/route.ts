import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/db';
import { videoJobWebhookSchema } from '../../../../lib/validation';

const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '3:4': { width: 960, height: 1280 },
  '4:3': { width: 1280, height: 960 },
  '9:16': { width: 960, height: 1706 },
  '16:9': { width: 1706, height: 960 },
};

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = videoJobWebhookSchema.safeParse(body);

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

  if (data.status === 'succeeded') {
    if (!data.url) {
      return NextResponse.json({ error: 'Missing asset URL for completed job' }, { status: 400 });
    }

    const dimensions = ASPECT_DIMENSIONS[log.aspect] ?? ASPECT_DIMENSIONS['1:1'];

    const asset = await prisma.asset.create({
      data: {
        projectId: log.projectId,
        mediaType: 'video',
        aspect: log.aspect,
        url: data.url,
        thumbUrl: data.thumbUrl ?? null,
        prompt: log.prompt ?? `Video generation job ${log.id}`,
        width: dimensions.width,
        height: dimensions.height,
      },
    });

    await prisma.generationLog.update({
      where: { id: log.id },
      data: {
        status: 'succeeded',
        durationMs: data.durationMs ?? log.durationMs,
        assetId: asset.id,
      },
    });

    return NextResponse.json({ success: true, assetId: asset.id });
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
