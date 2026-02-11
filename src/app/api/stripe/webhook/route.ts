import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe, PRO_MONTHLY_CREDITS } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  // Runtime check — not at module level to avoid breaking `next build`
  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('STRIPE_WEBHOOK_SECRET is required in production');
    }
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        // ── Credit purchase (one-time payment) ──
        if (session.metadata?.type === 'credit_purchase' && userId) {
          const creditsToAdd = parseInt(session.metadata.credits || '0', 10);
          const amountCents = session.amount_total || 0;

          if (creditsToAdd > 0) {
            await prisma.$transaction([
              prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: creditsToAdd } },
              }),
              prisma.creditPurchase.create({
                data: {
                  userId,
                  credits: creditsToAdd,
                  amountCents,
                  stripeSessionId: session.id,
                },
              }),
            ]);
            console.log(`Credit purchase: +${creditsToAdd} credits for user ${userId}`);
          }
          break;
        }

        // ── Subscription purchase ──
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subscriptionData = subscription as any;

          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeSubscriptionId: subscriptionId,
              stripePriceId: subscriptionData.items?.data?.[0]?.price?.id,
              stripeCurrentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
              // Grant Pro monthly credits on first subscription
              credits: { increment: PRO_MONTHLY_CREDITS },
            },
          });
          console.log(`New Pro subscription: +${PRO_MONTHLY_CREDITS} credits for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              stripePriceId: subscription.items?.data?.[0]?.price?.id,
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });
        } else {
          // Fallback: find user by customer ID
          const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;

          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              stripePriceId: subscription.items?.data?.[0]?.price?.id,
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeSubscriptionId: null,
              stripePriceId: null,
              stripeCurrentPeriodEnd: null,
            },
          });
        } else {
          // Fallback: find user by customer ID
          const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;

          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              stripeSubscriptionId: null,
              stripePriceId: null,
              stripeCurrentPeriodEnd: null,
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.error('Payment failed for invoice:', invoice.id);

        // Find user by Stripe customer ID and flag their account
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id ?? null;

        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              // Clear subscription so user loses pro access
              stripeSubscriptionId: null,
              stripePriceId: null,
              stripeCurrentPeriodEnd: null,
            },
          });
          console.log(`Payment failed — reverted user (customer ${customerId}) to free tier`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        // Only process subscription renewal invoices (not the first one — that's handled by checkout.session.completed)
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id ?? null;

        if (customerId) {
          const result = await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              credits: { increment: PRO_MONTHLY_CREDITS },
            },
          });
          if (result.count > 0) {
            console.log(`Monthly credit refill: +${PRO_MONTHLY_CREDITS} credits for customer ${customerId}`);
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
