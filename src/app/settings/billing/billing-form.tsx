'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loadStripe } from '@stripe/stripe-js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { Switch } from '@/components/ui/switch';

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || !process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY) {
  throw new Error('Missing Stripe publishable keys');
}

const getStripePromise = (isTestMode: boolean) => 
  loadStripe(isTestMode ? process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY! : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Add credit pack options
const CREDIT_PACKS = [
  { credits: 5000, price: 30 },
  { credits: 10000, price: 55 },
  { credits: 25000, price: 125 },
];

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
    connectedAccounts: Array<{
      id: string;
      accountType: string;
      accountId: string;
    }>;
    activeAccountsCount: number;
  };
}

export function BillingForm({ organization }: BillingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState(CREDIT_PACKS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

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

      router.refresh();
    } catch (error) {
      console.error('Error updating plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseCredits = async () => {
    try {
      setIsLoading(true);
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
      const stripe = await getStripePromise(isTestMode);
      
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to create checkout session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handlePurchaseCredits}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Billing Plan</CardTitle>
            <CardDescription>Choose your billing plan</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              defaultValue={organization.billingPlan}
              onValueChange={handlePlanChange}
              disabled={loading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unlimited" id="unlimited" />
                <Label htmlFor="unlimited">Unlimited</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="at_cost" id="at_cost" />
                <Label htmlFor="at_cost">At Cost ($30 per 5,000 credits)</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credit Balance</CardTitle>
            <CardDescription>Your current credit balance and usage history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-2xl font-bold">{organization.creditBalance.toLocaleString()} credits</p>
              {organization.billingPlan === 'at_cost' && (
                <Button
                  className="mt-4"
                  onClick={handlePurchaseCredits}
                  disabled={loading}
                >
                  Purchase Credits
                </Button>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-4">Recent Usage</h3>
              <div className="space-y-4">
                {organization.creditUsage.map((usage) => (
                  <div key={usage.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{usage.description || 'Scenario Run'}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(usage.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className={usage.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                      {usage.amount > 0 ? '+' : ''}{usage.amount}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Manage billing for your connected accounts ({organization.activeAccountsCount} active)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organization.connectedAccounts.map((account) => (
                <div key={account.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{account.accountType}</p>
                    <p className="text-sm text-gray-500">{account.accountId}</p>
                  </div>
                  <p>$9/month</p>
                </div>
              ))}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <p className="font-medium">Total Monthly Cost</p>
                  <p className="font-medium">${organization.activeAccountsCount * 9}/month</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Credits</CardTitle>
            <CardDescription>
              Purchase additional scenario run credits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Test Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable to use test cards and simulate payments
                  </p>
                </div>
                <Switch
                  checked={isTestMode}
                  onCheckedChange={setIsTestMode}
                />
              </div>
              <div className="space-y-2">
                <Label>Select Credit Pack</Label>
                <Select
                  value={selectedPack.credits.toString()}
                  onValueChange={(value) => 
                    setSelectedPack(CREDIT_PACKS.find(pack => pack.credits.toString() === value)!)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select credits" />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDIT_PACKS.map((pack) => (
                      <SelectItem key={pack.credits} value={pack.credits.toString()}>
                        {pack.credits.toLocaleString()} credits (${pack.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handlePurchaseCredits}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <span>Processing...</span>
                ) : (
                  <span>Purchase ${selectedPack.price} of Credits</span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
} 