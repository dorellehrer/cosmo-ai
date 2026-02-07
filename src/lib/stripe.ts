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

// Tier configuration
export const TIERS = {
  trial: {
    name: 'Trial',
    messagesPerDay: Infinity, // Full Pro access during trial
    price: 0,
    priceId: null,
  },
  expired: {
    name: 'Expired',
    messagesPerDay: 0, // No access after trial expires
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

// Get user's current tier based on subscription and trial status
export function getUserTier(
  stripeSubscriptionId: string | null,
  stripeCurrentPeriodEnd: Date | null,
  trialEnd?: Date | null
): TierName {
  // Active Stripe subscription = Pro
  if (stripeSubscriptionId && stripeCurrentPeriodEnd) {
    if (new Date() <= stripeCurrentPeriodEnd) {
      return 'pro';
    }
  }

  // Active trial = Trial (full Pro access)
  if (trialEnd && new Date() <= trialEnd) {
    return 'trial';
  }

  // No subscription, no trial or trial expired
  return 'expired';
}

/** Check if user has Pro-level access (either paid or trial) */
export function hasProAccess(tier: TierName): boolean {
  return tier === 'pro' || tier === 'trial';
}

// Check if user has reached their daily limit
export function hasReachedLimit(
  tier: TierName,
  currentUsage: number
): boolean {
  if (tier === 'expired') return true; // Expired users can't send messages
  const limit = TIERS[tier].messagesPerDay;
  return currentUsage >= limit;
}

// Get remaining messages for the day
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

// Format price for display
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
}
