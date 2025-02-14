'use client';

import { useSession } from 'next-auth/react';
import { User, CreditCard, Wallet } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';

const ClientUser = User as unknown as (props: any) => JSX.Element;
const ClientCreditCard = CreditCard as unknown as (props: any) => JSX.Element;
const ClientWallet = Wallet as unknown as (props: any) => JSX.Element;

interface BillingInfo {
  billingPlan: string;
  creditBalance: number;
  connectedAccounts: number;
  monthlyScenarioRuns: number;
  monthlyAccountBill: number;
  monthlyScenarioBill: number;
}

export default function UserSettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newName, setNewName] = useState(session?.user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(true);

  useEffect(() => {
    const fetchBillingInfo = async () => {
      try {
        const response = await fetch('/api/billing/info');
        if (!response.ok) throw new Error('Failed to fetch billing info');
        const data = await response.json();
        setBillingInfo(data);
      } catch (error) {
        console.error('Error fetching billing info:', error);
        toast.error('Failed to load billing information');
      } finally {
        setIsLoadingBilling(false);
      }
    };

    fetchBillingInfo();
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setIsUpdatingName(true);
    try {
      const response = await fetch('/api/user/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) {
        throw new Error('Failed to update name');
      }

      await updateSession();
      toast.success('Name updated successfully');
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const response = await fetch('/api/user/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update password');
      }

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
            <ClientUser className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.2px] text-gray-900">
              User Settings
            </h1>
            <p className="text-sm text-gray-500">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Billing Information */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
              <ClientWallet className="h-4 w-4 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold">Billing Overview</h2>
          </div>
          
          {isLoadingBilling ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : billingInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Connected Accounts</div>
                  <div className="text-2xl font-semibold text-gray-900">{billingInfo.connectedAccounts}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Monthly Account Bill</div>
                  <div className="text-2xl font-semibold text-gray-900">${billingInfo.monthlyAccountBill}</div>
                </div>
              </div>
              
              {billingInfo.billingPlan === 'at_cost' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500">Credit Balance</div>
                      <div className="text-2xl font-semibold text-gray-900">{billingInfo.creditBalance}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500">Monthly Scenario Bill</div>
                      <div className="text-2xl font-semibold text-gray-900">${billingInfo.monthlyScenarioBill}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    Monthly scenario runs: {billingInfo.monthlyScenarioRuns.toLocaleString()} credits
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500">Failed to load billing information</div>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
              <ClientCreditCard className="h-4 w-4 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold">Payment Method</h2>
          </div>
          <button
            onClick={() => window.location.href = '/api/billing/manage-payment'}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
          >
            Manage Payment Method
          </button>
        </div>

        {/* Update Name */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-6">
          <h2 className="text-lg font-semibold mb-4">Update Name</h2>
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                placeholder="Enter your name"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isUpdatingName || !newName.trim()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isUpdatingName ? 'Updating...' : 'Update Name'}
            </button>
          </form>
        </div>

        {/* Update Password */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-6">
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                placeholder="Enter current password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                placeholder="Enter new password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                placeholder="Confirm new password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </PageContainer>
  );
} 