'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import ContactRowActions from "./ContactRowActions";
import { useRouter } from "next/navigation";

// Types for our contact data
type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  photoUrl: string | null;
  title: string | null;
  currentCompanyName: string | null;
  propertyCount: number | null;
  pms: string | null;
  status?: string;
};

// Props for the component
interface ContactsTableProps {
  contacts: Contact[];
}

export default function ContactsTable({ contacts }: ContactsTableProps) {
  const router = useRouter();
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  
  // Empty state
  if (contacts.length === 0) {
    return (
      <div className="rounded-md border border-border p-8 text-center">
        <h3 className="text-lg font-medium">No contacts found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No contacts found for this organization.
        </p>
      </div>
    );
  }

  // Selection handlers
  const toggleSelection = (contactId: string) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAll = () => {
    if (selectedContactIds.length === contacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(contacts.map(contact => contact.id));
    }
  };

  const isSelected = (contactId: string) => selectedContactIds.includes(contactId);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="rounded-md border">
      {/* Bulk actions bar - shown when contacts are selected */}
      {selectedContactIds.length > 0 && (
        <div className="bg-muted/50 p-2 flex items-center justify-between">
          <div className="text-sm font-medium">
            {selectedContactIds.length} {selectedContactIds.length === 1 ? 'contact' : 'contacts'} selected
          </div>
          <div className="flex gap-2">
            <button 
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
              disabled={true} // Will be enabled in future implementation
            >
              Bulk Delete
            </button>
            <button 
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
              disabled={true} // Will be enabled in future implementation
            >
              Bulk Edit
            </button>
          </div>
        </div>
      )}
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox 
                checked={contacts.length > 0 && selectedContactIds.length === contacts.length}
                onCheckedChange={selectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Properties</TableHead>
            <TableHead>PMS</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id} className="hover:bg-muted/50">
              <TableCell className="p-4">
                <Checkbox 
                  checked={isSelected(contact.id)}
                  onCheckedChange={() => toggleSelection(contact.id)}
                  aria-label={`Select ${contact.firstName || contact.email}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  {contact.photoUrl ? (
                    <div className="flex-shrink-0 h-10 w-10">
                      <img className="h-10 w-10 rounded-full" src={contact.photoUrl} alt="" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-500">
                        {contact.firstName?.charAt(0) || contact.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="ml-4">
                    <div className="font-medium">
                      {contact.firstName || contact.lastName 
                        ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                        : 'Unknown Name'}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{contact.email}</TableCell>
              <TableCell>{contact.title || '-'}</TableCell>
              <TableCell>{contact.currentCompanyName || '-'}</TableCell>
              <TableCell>
                {contact.propertyCount !== null ? contact.propertyCount.toLocaleString() : '-'}
              </TableCell>
              <TableCell>{contact.pms || '-'}</TableCell>
              <TableCell>
                {contact.status ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {contact.status}
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    No Status
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <ContactRowActions 
                  contact={contact} 
                  onContactDeleted={handleRefresh} 
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
