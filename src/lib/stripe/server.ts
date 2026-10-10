/**
 * Server-side Stripe client initialization
 * This file should only be imported in server-side code (API routes, server components)
 */

import Stripe from "stripe";
import { getStripeConfig } from "./config";

let stripeInstance: Stripe | null = null;

/**
 * Gets or creates a Stripe instance for server-side operations
 * @returns {Stripe} Initialized Stripe client
 * @throws {Error} If STRIPE_SECRET_KEY is not configured
 */
export function getStripeServer(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  try {
    const config = getStripeConfig();

    stripeInstance = new Stripe(config.secretKey, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });

    return stripeInstance;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to initialize Stripe: ${error.message}`);
    }
    throw new Error("Failed to initialize Stripe: Unknown error");
  }
}

/**
 * Resets the Stripe instance (useful for testing)
 */
export function resetStripeInstance(): void {
  stripeInstance = null;
}
