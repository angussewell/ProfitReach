'use client';

import { Fragment, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import { Building, Plus, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { motion } from 'framer-motion';
import type { ReactElement, JSX } from 'react';

interface OrganizationSwitcherProps {
  open?: boolean;
}

interface ItemRenderPropArg {
  active: boolean;
}

export default function OrganizationSwitcher({ open = true }: OrganizationSwitcherProps): ReactElement {
  const { 
    organizations,
    currentOrganization,
    loading: isLoading,
    switching,
    switchOrganization,
    createOrganization,
    handleLogout
  } = useOrganization();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleOrgSwitch = async (orgId: string) => {
    if (switchOrganization) {
      await switchOrganization(orgId);
    }
  };

  const handleCreateOrg = async () => {
    if (createOrganization && newOrgName) {
      await createOrganization(newOrgName);
      setShowCreateModal(false);
      setNewOrgName('');
    }
  };

  return (
    <>
      {switching && (
        <LoadingOverlay message="Switching organization..." />
      )}
      
      <Menu as="div" className="relative inline-block text-left w-full max-w-[250px]">
        {({ open: menuOpen }): JSX.Element => (
          <>
            <div>
              <Menu.Button 
                className={cn(
                  "inline-flex w-full items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
                  !open && "justify-center"
                )}
                disabled={isLoading || switching}
                onClick={() => setIsOpen(!isOpen)}
              >
                <div className={cn(
                  "flex items-center min-w-0",
                  !open && "justify-center"
                )}>
                  <Building className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {open && (
                    <>
                      <span className="ml-2 truncate">
                        {currentOrganization?.name || 'Select Organization'}
                      </span>
                      <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                    </>
                  )}
                </div>
              </Menu.Button>
            </div>

            <Transition
              as={Fragment}
              show={menuOpen}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute left-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  {organizations?.map((org) => (
                    <Menu.Item key={org.id}>
                      {({ active }: ItemRenderPropArg) => (
                        <button
                          onClick={() => handleOrgSwitch(org.id)}
                          className={cn(
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                            'block w-full px-4 py-2 text-left text-sm'
                          )}
                        >
                          {org.name}
                        </button>
                      )}
                    </Menu.Item>
                  ))}

                  <Menu.Item>
                    {({ active }: ItemRenderPropArg) => (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className={cn(
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                          'flex w-full items-center px-4 py-2 text-left text-sm'
                        )}
                      >
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                        Create Organization
                      </button>
                    )}
                  </Menu.Item>

                  <Menu.Item>
                    {({ active }: ItemRenderPropArg) => (
                      <button
                        onClick={handleLogout}
                        className={cn(
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                          'flex w-full items-center px-4 py-2 text-left text-sm'
                        )}
                      >
                        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                        Logout
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </>
        )}
      </Menu>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-96 rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Create Organization</h2>
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Organization Name"
              className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrg}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 