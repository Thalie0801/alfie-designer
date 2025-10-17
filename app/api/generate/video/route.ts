import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/db';
import { getCurrentUser } from '../../../../lib/auth';
import { generateVideoSchema } from '../../../../lib/validation';

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

  const parsed = generateVideoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const data = parsed.data;

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

  const log = await prisma.generationLog.create({
    data: {
      userId: dbUser.id,
      projectId: project.id,
      model: 'placeholder-video-v1',
      mediaType: 'video',
      aspect: data.aspect,
      prompt: data.prompt,
      status: 'queued',
      costUsd: new Prisma.Decimal(0),
    },
  });

  // TODO: enqueue real video generation job with provider webhook callback.

  return NextResponse.json({ jobId: log.id });
}
