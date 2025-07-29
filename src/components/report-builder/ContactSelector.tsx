'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContactOption } from '@/types/report-builder';

interface ContactSelectorProps {
  value?: string;
  onChange: (contactId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Custom hook for debounced search
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ContactSelector({
  value,
  onChange,
  placeholder = "Select a contact...",
  disabled = false
}: ContactSelectorProps) {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);

  // Fetch contacts based on search query
  const fetchContacts = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set('q', query.trim());
      }
      params.set('limit', '50');

      const response = await fetch(`/api/report-builder/contacts/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts');
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load contacts when component mounts or search query changes
  useEffect(() => {
    fetchContacts(debouncedSearchQuery);
  }, [debouncedSearchQuery, fetchContacts]);

  // Format contact for display
  const formatContactLabel = useCallback((contact: ContactOption): string => {
    const name = contact.fullName || 
                 [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 
                 'Unnamed Contact';
    
    const email = contact.email ? ` (${contact.email})` : '';
    const company = contact.currentCompanyName ? ` - ${contact.currentCompanyName}` : '';
    
    return `${name}${email}${company}`;
  }, []);

  // Find selected contact
  const selectedContact = contacts.find(contact => contact.id === value);
  const selectedLabel = selectedContact ? formatContactLabel(selectedContact) : placeholder;

  if (error) {
    return (
      <div className="w-full p-3 border border-red-200 rounded-md bg-red-50 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate text-left flex-1">
              {isLoading ? "Loading contacts..." : selectedLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search contacts..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading 
                  ? "Loading contacts..." 
                  : searchQuery.trim() 
                    ? "No contacts found matching your search" 
                    : "No contacts available"
                }
              </CommandEmpty>
              {contacts.length > 0 && (
                <CommandGroup>
                  {contacts.map((contact) => {
                    const label = formatContactLabel(contact);
                    return (
                      <CommandItem
                        key={contact.id}
                        value={contact.id}
                        onSelect={(selectedValue) => {
                          onChange(selectedValue === value ? '' : selectedValue);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value === contact.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-medium">
                            {contact.fullName || 
                             [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 
                             'Unnamed Contact'}
                          </div>
                          {contact.email && (
                            <div className="truncate text-xs text-muted-foreground">
                              {contact.email}
                            </div>
                          )}
                          {contact.currentCompanyName && (
                            <div className="truncate text-xs text-muted-foreground">
                              {contact.currentCompanyName}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {isLoading && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <div className="animate-spin h-3 w-3 border border-gray-300 border-t-gray-600 rounded-full"></div>
          Searching contacts...
        </div>
      )}
      
      {!isLoading && contacts.length > 0 && (
        <div className="text-xs text-gray-500">
          Found {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}