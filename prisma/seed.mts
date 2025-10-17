import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@alfie-designer.test';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  let project = await prisma.project.findFirst({
    where: {
      ownerId: user.id,
      name: 'Projet Démo',
    },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Projet Démo',
        ownerId: user.id,
      },
    });
  }

  const existingSeedCredit = await prisma.creditLedger.findFirst({
    where: {
      userId: user.id,
      reason: 'seed-initial-credit',
    },
  });

  if (!existingSeedCredit) {
    await prisma.creditLedger.create({
      data: {
        userId: user.id,
        delta: 50,
        reason: 'seed-initial-credit',
      },
    });
  }

  console.info('Seed completed for user %s (project %s)', user.email, project.id);
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
