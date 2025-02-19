'use client';

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface StripeContextType {
  stripe: Stripe | null;
  isTestMode: boolean;
  setIsTestMode: (isTest: boolean) => void;
}

const defaultContext: StripeContextType = {
  stripe: null,
  isTestMode: false,
  setIsTestMode: () => {},
};

const StripeContext = createContext(defaultContext);

export function useStripe() {
  return useContext(StripeContext);
}

export function StripeProvider({ children }: { children: ReactNode }) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    const initStripe = async () => {
      const publishableKey = isTestMode
        ? process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
        : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      if (!publishableKey) {
        console.error(`Missing ${isTestMode ? 'test' : 'live'} Stripe publishable key`);
        return;
      }

      try {
        const stripe = await loadStripe(publishableKey);
        setStripe(stripe);
      } catch (error) {
        console.error('Error loading Stripe:', error);
      }
    };

    initStripe();
  }, [isTestMode]);

  return (
    <StripeContext.Provider value={{ stripe, isTestMode, setIsTestMode }}>
      {children}
    </StripeContext.Provider>
  );
} 