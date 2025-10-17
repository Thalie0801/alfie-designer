import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/db';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })
  : null;

const PLAN_CREDITS: Record<string, number> = {
  starter: 50,
  pro: 200,
};

export async function POST(request: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'invoice.payment_succeeded') {
    return NextResponse.json({ received: true });
  }

  const invoice = event.data.object as Stripe.Invoice;

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  const lineItem = invoice.lines.data[0];
  const lookupKey = lineItem?.price?.lookup_key;
  const plan = lookupKey === 'pro' ? 'pro' : lookupKey === 'starter' ? 'starter' : null;

  if (!customerId || !plan) {
    return NextResponse.json({ received: true });
  }

  const periodEndUnix = lineItem?.period?.end ?? invoice.lines.data[0]?.period?.end ?? invoice.period_end;
  const periodEndDate = periodEndUnix ? new Date(periodEndUnix * 1000) : new Date();

  const existingSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  });

  let userId: string | null = existingSubscription?.userId ?? null;

  if (!userId) {
    const email = invoice.customer_email?.toLowerCase();

    if (email) {
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email },
      });

      userId = user.id;
    }
  }

  if (!userId) {
    return NextResponse.json({ received: true });
  }

  await prisma.subscription.upsert({
    where: { stripeCustomerId: customerId },
    update: {
      userId,
      stripeSubId: subscriptionId ?? undefined,
      plan,
      status: invoice.status ?? 'active',
      currentPeriodEnd: periodEndDate,
    },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubId: subscriptionId ?? undefined,
      plan,
      status: invoice.status ?? 'active',
      currentPeriodEnd: periodEndDate,
    },
  });

  const creditReason = `stripe-invoice:${invoice.id}`;

  const existingCredit = await prisma.creditLedger.findFirst({
    where: {
      userId,
      reason: creditReason,
    },
  });

  if (!existingCredit) {
    const credits = PLAN_CREDITS[plan];

    if (credits > 0) {
      await prisma.creditLedger.create({
        data: {
          userId,
          delta: credits,
          reason: creditReason,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
