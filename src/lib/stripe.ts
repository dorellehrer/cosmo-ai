import Stripe from 'stripe';

// Initialize Stripe with placeholder key (replace with real key in production)
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
  {
    apiVersion: '2024-06-20',
    typescript: true,
  }
);

// Tier configuration
export const TIERS = {
  free: {
    name: 'Free',
    messagesPerDay: 50,
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

// Get user's current tier based on subscription status
export function getUserTier(
  stripeSubscriptionId: string | null,
  stripeCurrentPeriodEnd: Date | null
): TierName {
  if (!stripeSubscriptionId || !stripeCurrentPeriodEnd) {
    return 'free';
  }
  
  // Check if subscription is still active
  if (new Date() > stripeCurrentPeriodEnd) {
    return 'free';
  }
  
  return 'pro';
}

// Check if user has reached their daily limit
export function hasReachedLimit(
  tier: TierName,
  currentUsage: number
): boolean {
  const limit = TIERS[tier].messagesPerDay;
  return currentUsage >= limit;
}

// Get remaining messages for the day
export function getRemainingMessages(
  tier: TierName,
  currentUsage: number
): number {
  const limit = TIERS[tier].messagesPerDay;
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - currentUsage);
}

// Format price for display
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
}
