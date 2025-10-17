import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/db';
import { getCurrentUser } from '../../../../lib/auth';
import { deletePath } from '../../../../lib/storage';

const storagePrefix = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${process.env.STORAGE_BUCKET ?? 'assets'}/`
  : null;

async function ensureProjectOwner(userEmail: string, userId: string, projectId: string) {
  const dbUser = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      id: userId,
      email: userEmail,
    },
  });

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: dbUser.id,
    },
  });

  return { dbUser, project };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { project } = await ensureProjectOwner(user.email, user.id, params.id);

  if (!project) {
    return NextResponse.json({ error: 'Project not found or you do not have access.' }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { project } = await ensureProjectOwner(user.email, user.id, params.id);

  if (!project) {
    return NextResponse.json({ error: 'Project not found or you do not have access.' }, { status: 404 });
  }

  const assets = await prisma.asset.findMany({ where: { projectId: project.id } });

  await prisma.project.delete({ where: { id: project.id } });

  for (const asset of assets) {
    if (!storagePrefix || !asset.url.startsWith(storagePrefix)) {
      continue;
    }

    const path = asset.url.slice(storagePrefix.length);

    if (path) {
      try {
        await deletePath(path);
      } catch (error) {
        // TODO: capture and report storage deletion errors (non-blocking for now).
        console.error(error);
      }
    }
  }

  return NextResponse.json({ success: true });
}
