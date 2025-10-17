import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/db';
import { getCurrentUser } from '../../../../../lib/auth';
import { assetListQuerySchema } from '../../../../../lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      id: params.id,
      ownerId: dbUser.id,
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found or you do not have access.' }, { status: 404 });
  }

  const query = assetListQuerySchema.safeParse({
    page: request.nextUrl.searchParams.get('page'),
    limit: request.nextUrl.searchParams.get('limit'),
  });

  if (!query.success) {
    return NextResponse.json({ error: query.error.message }, { status: 400 });
  }

  const { page, limit } = query.data;
  const skip = (page - 1) * limit;

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.asset.count({ where: { projectId: project.id } }),
  ]);

  return NextResponse.json({
    assets,
    page,
    total,
    hasMore: skip + assets.length < total,
  });
}
