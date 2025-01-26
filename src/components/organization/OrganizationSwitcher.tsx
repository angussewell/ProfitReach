'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Building } from 'lucide-react';

export default function OrganizationSwitcher() {
  const { data: session } = useSession();
  const { 
    organizations,
    currentOrganization,
    loading,
    switching,
    switchOrganization,
    createOrganization
  } = useOrganization();

  const handleOrgChange = (orgId: string) => {
    if (!orgId) return;
    switchOrganization(orgId);
  };

  const handleCreateOrg = async () => {
    const name = prompt('Enter organization name:');
    if (name) {
      await createOrganization(name);
    }
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button 
          className="inline-flex w-full items-center justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          disabled={loading || switching}
        >
          <Building className="w-4 h-4 mr-2" />
          {loading ? 'Loading...' : currentOrganization?.name || 'Select Organization'}
          <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
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
        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {/* User Info */}
          <div className="px-4 py-3">
            <p className="text-sm">Signed in as</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {session?.user?.email}
            </p>
          </div>

          {/* Organizations */}
          <div className="py-1">
            {organizations.map((org) => (
              <Menu.Item key={org.id}>
                {({ active }) => (
                  <button
                    onClick={() => handleOrgChange(org.id)}
                    className={cn(
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                      'block w-full px-4 py-2 text-left text-sm',
                      currentOrganization?.id === org.id && 'font-medium'
                    )}
                    disabled={switching}
                  >
                    {org.name}
                    {currentOrganization?.id === org.id && (
                      <span className="ml-2 text-blue-600">✓</span>
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>

          {/* Admin Actions */}
          {session?.user?.role === 'admin' && (
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleCreateOrg}
                    className={cn(
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                      'block w-full px-4 py-2 text-left text-sm'
                    )}
                    disabled={switching}
                  >
                    + Create Organization
                  </button>
                )}
              </Menu.Item>
            </div>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
} 