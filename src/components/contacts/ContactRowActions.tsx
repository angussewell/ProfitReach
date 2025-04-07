'use client';

import { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import Link from 'next/link';

// Types
type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

interface ContactRowActionsProps {
  contact: Contact;
  onContactDeleted: () => void;
}

export default function ContactRowActions({ contact, onContactDeleted }: ContactRowActionsProps) {
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete contact');
      }

      // Success - close the dialog and refresh the contact list
      setIsDeleteAlertOpen(false);
      onContactDeleted();
    } catch (error) {
      console.error('Error deleting contact:', error);
      setDeleteError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const contactName = contact.firstName || contact.lastName 
    ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
    : contact.email;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900">
            •••
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/contacts/${contact.id}/edit`} className="cursor-pointer">
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-red-600 focus:text-red-600"
            onClick={() => setIsDeleteAlertOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{contactName}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <div className="mt-2 p-2 text-sm bg-red-50 border border-red-200 rounded text-red-600">
              {deleteError}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
