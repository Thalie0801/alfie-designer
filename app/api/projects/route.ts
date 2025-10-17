import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { getCurrentUser } from '../../../lib/auth';
import { projectCreateSchema } from '../../../lib/validation';

export async function GET() {
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

  const projects = await prisma.project.findMany({
    where: { ownerId: dbUser.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ projects });
}

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

  const parsed = projectCreateSchema.safeParse(body);

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

  const project = await prisma.project.create({
    data: {
      name: data.name,
      ownerId: dbUser.id,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
