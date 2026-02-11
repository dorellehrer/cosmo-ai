import Stripe from 'stripe';

// Lazy Stripe initialization — throws at first use in production if key is missing,
// but does NOT throw during `next build` which evaluates modules at build time.
function createStripeClient(): Stripe {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey && process.env.NODE_ENV === 'production') {
    throw new Error('STRIPE_SECRET_KEY is required in production');
  }

  return new Stripe(
    stripeKey || 'sk_test_placeholder_dev_only',
    {
      // @ts-expect-error - API version may differ from types
      apiVersion: '2024-06-20',
      typescript: true,
    }
  );
}

let _stripe: Stripe | null = null;

/** Get the Stripe client. Throws in production if STRIPE_SECRET_KEY is not set. */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    if (!_stripe) {
      _stripe = createStripeClient();
    }
    const value = Reflect.get(_stripe, prop, receiver);
    return typeof value === 'function' ? value.bind(_stripe) : value;
  },
});

// ── Subscription config ─────────────────────────────────────────

/** Stripe Price ID for the Pro subscription ($20/month) */
export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || 'price_placeholder_pro';

/** Credits given to free users on signup */
export const FREE_MONTHLY_CREDITS = 20;

/** Credits auto-refilled monthly for Pro subscribers */
export const PRO_MONTHLY_CREDITS = 1000;

/** AI call cost: $0.10 per minute (10 cents) */
export const CALL_COST_PER_MINUTE_CENTS = 10;

// ── Credit packages ─────────────────────────────────────────────

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  /** Stripe Price ID — set via env vars */
  stripePriceId: string;
  /** Badge label for UI ("Popular", "Best Value", etc.) */
  badge?: string;
  /** Per-credit price for comparison display */
  perCredit: number;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 100,
    priceCents: 500,
    stripePriceId: process.env.STRIPE_CREDITS_100_PRICE_ID || 'price_credits_100',
    perCredit: 0.05,
  },
  {
    id: 'popular',
    name: 'Popular',
    credits: 500,
    priceCents: 2000,
    stripePriceId: process.env.STRIPE_CREDITS_500_PRICE_ID || 'price_credits_500',
    badge: 'Most Popular',
    perCredit: 0.04,
  },
  {
    id: 'power',
    name: 'Power Pack',
    credits: 1500,
    priceCents: 5000,
    stripePriceId: process.env.STRIPE_CREDITS_1500_PRICE_ID || 'price_credits_1500',
    badge: 'Best Value',
    perCredit: 0.033,
  },
];

// ── Helpers ─────────────────────────────────────────────────────

/** Check if user has an active Pro subscription */
export function isPro(user: {
  stripeSubscriptionId: string | null;
  stripeCurrentPeriodEnd: Date | null;
}): boolean {
  if (!user.stripeSubscriptionId || !user.stripeCurrentPeriodEnd) return false;
  return new Date() <= user.stripeCurrentPeriodEnd;
}

/** Check if user can afford a model based on their credit balance */
export function canAffordModel(credits: number, creditCost: number): boolean {
  return credits >= creditCost;
}

/** Get the credit package by its Stripe Price ID */
export function getCreditPackageByPriceId(priceId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.stripePriceId === priceId);
}

/** Format price for display */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
}
