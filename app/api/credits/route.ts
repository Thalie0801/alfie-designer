import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { getCurrentUser } from '../../../lib/auth';
import { creditAdjustmentSchema } from '../../../lib/validation';

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

  const creditAggregate = await prisma.creditLedger.aggregate({
    _sum: { delta: true },
    where: { userId: dbUser.id },
  });

  return NextResponse.json({ balance: creditAggregate._sum.delta ?? 0 });
}

export async function POST(request: NextRequest) {
  const isAdmin = request.headers.get('x-demo-admin') === 'true';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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

  const parsed = creditAdjustmentSchema.safeParse(body);

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

  const entry = await prisma.creditLedger.create({
    data: {
      userId: dbUser.id,
      delta: data.delta,
      reason: data.reason,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
