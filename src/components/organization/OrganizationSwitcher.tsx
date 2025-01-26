'use client';

import { Fragment, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface Organization {
  id: string;
  name: string;
  ghlConnected: boolean;
  createdAt: string;
}

export default function OrganizationSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
        
        // Set current organization
        const current = data.find((org: Organization) => 
          org.id === session?.user?.organizationId
        );
        if (current) {
          setCurrentOrg(current);
        }
      }
    };

    if (session?.user) {
      fetchOrganizations();
    }
  }, [session]);

  const switchOrganization = async (orgId: string) => {
    const response = await fetch('/api/organizations/switch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId: orgId }),
    });

    if (response.ok) {
      // Update session with new organization
      await update();
      // Refresh the page to update all data
      router.refresh();
    }
  };

  if (!currentOrg) return null;

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          {currentOrg.name}
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
        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {organizations.map((org) => (
              <Menu.Item key={org.id}>
                {({ active }: { active: boolean }) => (
                  <button
                    onClick={() => switchOrganization(org.id)}
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } block w-full px-4 py-2 text-left text-sm ${
                      org.id === currentOrg.id ? 'font-bold' : ''
                    }`}
                  >
                    {org.name}
                    {!org.ghlConnected && (
                      <span className="ml-2 text-xs text-orange-500">
                        (GHL not connected)
                      </span>
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
} 