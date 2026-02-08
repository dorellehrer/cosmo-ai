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

// ── Subscription tier config (kept for backward compat) ─────────

export const TIERS = {
  trial: {
    name: 'Trial',
    messagesPerDay: Infinity,
    price: 0,
    priceId: null,
  },
  expired: {
    name: 'Expired',
    messagesPerDay: 0,
    price: 0,
    priceId: null,
  },
  pro: {
    name: 'Pro',
    messagesPerDay: Infinity,
    price: 20,
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_placeholder_pro',
  },
} as const;

export type TierName = keyof typeof TIERS;

/** Duration of the free trial in milliseconds (3 days) */
export const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

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

// ── Tier helpers ─────────────────────────────────────────────────

export function getUserTier(
  stripeSubscriptionId: string | null,
  stripeCurrentPeriodEnd: Date | null,
  trialEnd?: Date | null,
  freeTrialUsed?: boolean
): TierName {
  if (stripeSubscriptionId && stripeCurrentPeriodEnd) {
    if (new Date() <= stripeCurrentPeriodEnd) {
      return 'pro';
    }
  }

  if (trialEnd && new Date() <= trialEnd) {
    return 'trial';
  }

  // Legacy user: treat as trial-eligible
  if (!trialEnd && freeTrialUsed === false) {
    return 'trial';
  }

  return 'expired';
}

/** Check if user has Pro-level access (either paid or trial) */
export function hasProAccess(tier: TierName): boolean {
  return tier === 'pro' || tier === 'trial';
}

export function hasReachedLimit(
  tier: TierName,
  currentUsage: number
): boolean {
  if (tier === 'expired') return true;
  const limit = TIERS[tier].messagesPerDay;
  return currentUsage >= limit;
}

export function getRemainingMessages(
  tier: TierName,
  currentUsage: number
): number {
  if (tier === 'expired') return 0;
  const limit = TIERS[tier].messagesPerDay;
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - currentUsage);
}

/** Get trial time remaining as a human-readable string */
export function getTrialTimeRemaining(trialEnd: Date | null): string | null {
  if (!trialEnd) return null;
  const now = new Date();
  const diff = trialEnd.getTime() - now.getTime();
  if (diff <= 0) return null;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days > 0) {
    return `${days}d ${remainingHours}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h remaining`;
  }
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m remaining`;
}

// ── Credit helpers ──────────────────────────────────────────────

/** Check if user can afford a model. 0-cost models are always affordable. */
export function canAffordModel(credits: number, creditCost: number): boolean {
  if (creditCost === 0) return true;
  return credits >= creditCost;
}

/** Get the credit package by its Stripe Price ID */
export function getCreditPackageByPriceId(priceId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.stripePriceId === priceId);
}

// Format price for display
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
}
