'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useStripe } from '@/components/providers/StripeProvider';

interface BillingFormProps {
  organization: {
    id: string;
    billingPlan: string;
    creditBalance: number;
    creditUsage: Array<{
      id: string;
      amount: number;
      description: string | null;
      createdAt: Date;
    }>;
  };
  onPlanChange?: (plan: string) => void;
}

const CREDIT_PACKS = [
  { credits: 5000, price: 50 },
  { credits: 10000, price: 95 },
  { credits: 25000, price: 225 },
];

export function BillingForm({ organization, onPlanChange }: BillingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(organization.billingPlan);
  const [selectedPack, setSelectedPack] = useState(CREDIT_PACKS[0]);
  const { stripe, isTestMode, setIsTestMode } = useStripe();

  const handlePlanChange = async (plan: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        throw new Error('Failed to update plan');
      }

      setCurrentPlan(plan);
      toast.success('Billing plan updated successfully');
      onPlanChange?.(plan);
      router.refresh();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseCredits = async () => {
    if (!stripe) {
      toast.error('Stripe is not initialized');
      return;
    }

    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credits: selectedPack.credits,
          price: selectedPack.price,
          isTestMode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to create checkout session');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Billing Plan</h2>
          <p className="text-sm text-gray-500">Choose your billing plan</p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="unlimited"
              name="billingPlan"
              value="unlimited"
              checked={currentPlan === 'unlimited'}
              onChange={(e) => handlePlanChange(e.target.value)}
              disabled={loading}
              className="h-4 w-4 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="unlimited" className="text-sm font-medium">
              Unlimited
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="at_cost"
              name="billingPlan"
              value="at_cost"
              checked={currentPlan === 'at_cost'}
              onChange={(e) => handlePlanChange(e.target.value)}
              disabled={loading}
              className="h-4 w-4 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="at_cost" className="text-sm font-medium">
              At Cost ($50 per 5,000 credits)
            </label>
          </div>
          {loading && (
            <div className="text-sm text-gray-500">
              Updating billing plan...
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Credit Balance</h2>
          <p className="text-sm text-gray-500">Your current credit balance and usage history</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{organization.creditBalance.toLocaleString()} credits</p>
          {organization.billingPlan === 'at_cost' && (
            <button
              onClick={handlePurchaseCredits}
              disabled={loading}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Purchase Credits
            </button>
          )}
        </div>
      </div>

      {organization.billingPlan === 'at_cost' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Purchase Credits</h2>
            <p className="text-sm text-gray-500">Select a credit pack to purchase</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Test Mode</label>
                <p className="text-sm text-gray-500">
                  Enable to use test cards and simulate payments
                </p>
              </div>
              <input
                type="checkbox"
                checked={isTestMode}
                onChange={(e) => setIsTestMode(e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 rounded"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Credit Pack</label>
              <select
                value={selectedPack.credits.toString()}
                onChange={(e) => 
                  setSelectedPack(CREDIT_PACKS.find(pack => pack.credits.toString() === e.target.value)!)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {CREDIT_PACKS.map((pack) => (
                  <option key={pack.credits} value={pack.credits.toString()}>
                    {pack.credits.toLocaleString()} credits (${pack.price})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handlePurchaseCredits}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Purchase ${selectedPack.price} of Credits
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 