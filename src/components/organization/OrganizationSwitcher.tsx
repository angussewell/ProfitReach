'use client';

import { Fragment, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Building, Plus, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export default function OrganizationSwitcher() {
  const { 
    organizations,
    currentOrganization,
    loading: isLoading,
    switching,
    switchOrganization,
    createOrganization
  } = useOrganization();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const handleOrgChange = async (orgId: string) => {
    if (!orgId || isLoading || switching) return;
    try {
      await switchOrganization(orgId);
    } catch (err) {
      console.error('Failed to switch organization:', err);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName || isLoading || switching) return;

    try {
      await createOrganization(newOrgName);
      setNewOrgName('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create organization:', err);
    }
  };

  return (
    <>
      {switching && (
        <LoadingOverlay message="Switching organization..." />
      )}
      
      <Menu as="div" className="relative inline-block text-left w-full max-w-[250px]">
        <div>
          <Menu.Button 
            className="inline-flex w-full items-center justify-between gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            disabled={isLoading || switching}
          >
            <div className="flex items-center min-w-0">
              <Building className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">
                {currentOrganization?.name || 'Select Organization'}
              </span>
            </div>
            <ChevronDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute left-0 z-10 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {organizations.map((org) => (
                <Menu.Item key={org.id}>
                  {({ active }) => (
                    <button
                      onClick={() => handleOrgChange(org.id)}
                      className={cn(
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                        'block w-full px-4 py-2 text-left text-sm truncate',
                        currentOrganization?.id === org.id && 'font-medium'
                      )}
                      disabled={isLoading || switching}
                    >
                      <span className="flex items-center">
                        <span className="truncate">{org.name}</span>
                        {currentOrganization?.id === org.id && (
                          <span className="ml-2 text-blue-600 flex-shrink-0">✓</span>
                        )}
                      </span>
                    </button>
                  )}
                </Menu.Item>
              ))}

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className={cn(
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                      'block w-full px-4 py-2 text-left text-sm border-t'
                    )}
                  >
                    <span className="flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      <span>Create Organization</span>
                    </span>
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className={cn(
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                      'block w-full px-4 py-2 text-left text-sm border-t'
                    )}
                  >
                    <span className="flex items-center">
                      <LogOut className="w-4 h-4 mr-2" />
                      <span>Sign Out</span>
                    </span>
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Create New Organization</h2>
            <form onSubmit={handleCreateOrg}>
              <input
                type="text"
                placeholder="Organization Name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-4"
                disabled={isLoading || switching}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newOrgName || isLoading || switching}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 