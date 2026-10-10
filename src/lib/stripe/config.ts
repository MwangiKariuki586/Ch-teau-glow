/**
 * Stripe configuration and environment variable validation
 */

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

/**
 * Validates and returns Stripe configuration from environment variables
 * @throws {Error} If required environment variables are missing
 */
export function getStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is required. Please add it to your environment variables."
    );
  }

  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required. Please add it to your environment variables."
    );
  }

  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is required. Please add it to your environment variables."
    );
  }

  // Validate API key format (skip validation for test placeholder)
  if (secretKey !== "test" && !secretKey.startsWith("sk_")) {
    throw new Error(
      "Invalid STRIPE_SECRET_KEY format. Secret keys should start with 'sk_'."
    );
  }

  if (publishableKey !== "test" && !publishableKey.startsWith("pk_")) {
    throw new Error(
      "Invalid NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY format. Publishable keys should start with 'pk_'."
    );
  }

  return {
    secretKey,
    publishableKey,
    webhookSecret,
  };
}

/**
 * Gets the Stripe publishable key for client-side use
 * @throws {Error} If NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set
 */
export function getStripePublishableKey(): string {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required. Please add it to your environment variables."
    );
  }

  if (publishableKey !== "test" && !publishableKey.startsWith("pk_")) {
    throw new Error(
      "Invalid NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY format. Publishable keys should start with 'pk_'."
    );
  }

  return publishableKey;
}
