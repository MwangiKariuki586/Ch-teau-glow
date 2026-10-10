/**
 * useStripeElements hook
 * Loads and initializes Stripe.js and Elements
 */

"use client";

import { useEffect, useState } from "react";
import { loadStripe, Stripe, StripeElements } from "@stripe/stripe-js";

interface UseStripeElementsReturn {
  stripe: Stripe | null;
  elements: StripeElements | null;
  isLoaded: boolean;
}

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Gets or creates the Stripe.js promise
 */
function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

/**
 * Hook to load and initialize Stripe Elements
 */
export function useStripeElements(): UseStripeElementsReturn {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initializeStripe() {
      try {
        const stripeInstance = await getStripe();
        
        if (!mounted) return;

        if (stripeInstance) {
          setStripe(stripeInstance);
          setIsLoaded(true);
        } else {
          console.error("Failed to load Stripe");
          setIsLoaded(true);
        }
      } catch (error) {
        console.error("Error loading Stripe:", error);
        if (mounted) {
          setIsLoaded(true);
        }
      }
    }

    initializeStripe();

    return () => {
      mounted = false;
    };
  }, []);

  return { stripe, elements, isLoaded };
}
