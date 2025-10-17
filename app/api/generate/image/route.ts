import { Buffer } from 'node:buffer';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/db';
import { getCurrentUser } from '../../../../lib/auth';
import { uploadFromBuffer } from '../../../../lib/storage';
import type { StorageUploadResult } from '../../../../lib/storage';
import { generateImageSchema } from '../../../../lib/validation';

const COST_PER_IMAGE = 1;

const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '3:4': { width: 960, height: 1280 },
  '4:3': { width: 1280, height: 960 },
  '9:16': { width: 960, height: 1706 },
  '16:9': { width: 1706, height: 960 },
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = generateImageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const data = parsed.data;
  const count = data.count ?? 1;

  const dbUser = await prisma.user.upsert({
    where: { email: user.email },
    update: {},
    create: {
      id: user.id,
      email: user.email,
    },
  });

  const project = await prisma.project.findFirst({
    where: {
      id: data.projectId,
      ownerId: dbUser.id,
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found or you do not have access.' }, { status: 403 });
  }

  const creditAggregate = await prisma.creditLedger.aggregate({
    _sum: { delta: true },
    where: { userId: dbUser.id },
  });

  const balance = creditAggregate._sum.delta ?? 0;
  const requiredCredits = count * COST_PER_IMAGE;

  if (balance < requiredCredits) {
    return NextResponse.json({ error: 'Insufficient credits. Please top up to continue generating assets.' }, { status: 403 });
  }

  const uploads: StorageUploadResult[] = [];

  for (let index = 0; index < count; index += 1) {
    try {
      const buffer = Buffer.from(`Placeholder image for prompt: ${data.prompt} (${index + 1}/${count})`);
      const upload = await uploadFromBuffer(project.id, `placeholder-${index + 1}.txt`, buffer, 'text/plain');
      uploads.push(upload);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to upload generated asset.' }, { status: 500 });
    }
  }

  const dimensions = ASPECT_DIMENSIONS[data.aspect] ?? ASPECT_DIMENSIONS['1:1'];

  const createdAssets = await prisma.$transaction(async (tx) => {
    const assets = [] as {
      id: string;
      url: string;
      thumbUrl: string | null;
      aspect: string;
      mediaType: string;
    }[];

    await tx.creditLedger.create({
      data: {
        userId: dbUser.id,
        delta: -requiredCredits,
        reason: `image-generation:${project.id}`,
      },
    });

    for (const upload of uploads) {
      const asset = await tx.asset.create({
        data: {
          projectId: project.id,
          mediaType: 'image',
          aspect: data.aspect,
          url: upload.publicUrl ?? upload.url,
          thumbUrl: upload.thumbUrl ?? null,
          prompt: data.prompt,
          width: dimensions.width,
          height: dimensions.height,
        },
      });

      await tx.generationLog.create({
        data: {
          userId: dbUser.id,
          projectId: project.id,
          model: 'placeholder-v1',
          mediaType: 'image',
          aspect: data.aspect,
          prompt: data.prompt,
          durationMs: 0,
          costUsd: new Prisma.Decimal(0),
          status: 'succeeded',
          assetId: asset.id,
        },
      });

      assets.push({
        id: asset.id,
        url: asset.url,
        thumbUrl: asset.thumbUrl ?? null,
        aspect: asset.aspect,
        mediaType: asset.mediaType,
      });
    }

    return assets;
  });

  return NextResponse.json({ assets: createdAssets });
}
