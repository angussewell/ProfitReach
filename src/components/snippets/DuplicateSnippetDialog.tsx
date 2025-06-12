'use client';

import React, { useState, useEffect, useContext } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from '@/contexts/OrganizationContext'; // Import the hook instead

// Define a simple type for the snippet prop
interface Snippet {
  id: string;
  name: string;
  // Add other fields if needed by the component, though only id and name are used here
}

// Define a simple type for the organization list
interface Organization {
  id: string;
  name: string;
}

// --- API Call Functions ---

// Function to fetch user's organizations
async function fetchUserOrganizations(): Promise<Organization[]> {
    const response = await fetch('/api/organizations/list-mine');
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Catch JSON parsing errors
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Function to call the duplicate snippet API
async function duplicateSnippetApiCall(snippetId: string, targetOrganizationId: string): Promise<Snippet> {
    const response = await fetch(`/api/snippets/${snippetId}/duplicate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetOrganizationId }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Catch JSON parsing errors
        // Try to provide a more specific error message if available
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    // Expecting the newly created snippet data in the response
    return await response.json();
}


// --- Component ---

interface DuplicateSnippetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    snippet: Snippet | null;
    refreshSnippets: () => void; // Function to refresh the list on the parent page
}

export function DuplicateSnippetDialog({
    isOpen,
    onClose,
    snippet,
    refreshSnippets
}: DuplicateSnippetDialogProps) {
    const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const { toast } = useToast();
    const { currentOrganization } = useOrganization(); // Use the hook

    const currentUserOrgId = currentOrganization?.id; // Get current org ID

    // Combobox state
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<string | null>(targetOrgId ?? null);

    // Fetch organizations when modal opens
    useEffect(() => {
        if (isOpen && currentUserOrgId) {
            setTargetOrgId(null);
            setSelectedOrg(null);
            setIsLoadingOrgs(true);
            setOrganizations([]);
            fetchUserOrganizations()
                .then(orgs => setOrganizations(orgs))
                .catch(err => {
                    console.error("Failed to fetch organizations", err);
                    toast({
                        title: "Error Loading Organizations",
                        description: err.message || "Could not load organization list.",
                        variant: "destructive",
                    });
                })
                .finally(() => setIsLoadingOrgs(false));
        }
    }, [isOpen, currentUserOrgId, toast]);

    const handleDuplicate = async (selectedTargetOrgId: string | null) => {
        if (!snippet || !selectedTargetOrgId) return;
        setIsDuplicating(true);
        try {
            const duplicatedSnippet = await duplicateSnippetApiCall(snippet.id, selectedTargetOrgId);
            toast({
                title: "Success",
                description: `Snippet '${duplicatedSnippet.name}' duplicated successfully!`,
            });
            refreshSnippets();
            onClose();
        } catch (error) {
            console.error("Duplication failed:", error);
            toast({
                title: "Duplication Failed",
                description: error instanceof Error ? error.message : "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsDuplicating(false);
        }
    };

    const otherOrganizations = organizations.filter(org => org.id !== currentUserOrgId);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Duplicate Snippet: '{snippet?.name}'</DialogTitle>
                    <DialogDescription>
                        Choose where to duplicate this snippet.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Option 1: Same Org */}
                    {currentUserOrgId && (
                        <Button
                            onClick={() => handleDuplicate(currentUserOrgId)}
                            disabled={isDuplicating || isLoadingOrgs}
                            className="w-full"
                        >
                            {isDuplicating ? "Duplicating..." : `Duplicate in ${currentOrganization?.name || 'current organization'}`}
                        </Button>
                    )}

                    {/* Option 2: Cross Org - Combobox */}
                    <div className="space-y-2 pt-4 border-t">
                        <Label htmlFor="target-org-combobox">Or duplicate to another organization:</Label>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={comboboxOpen}
                                    className="w-full justify-between"
                                    id="target-org-combobox"
                                >
                                    {selectedOrg
                                        ? otherOrganizations.find((org) => org.id === selectedOrg)?.name
                                        : "Select organization..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                                <Command>
                                    <CommandInput
                                        placeholder="Search organizations..."
                                        className="h-9"
                                        autoFocus
                                    />
                                    <CommandEmpty>No organization found.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandList>
                                            {otherOrganizations.map((org) => (
                                        <CommandItem
                                            key={org.id}
                                            value={org.name}
                                            onSelect={() => {
                                                setSelectedOrg(org.id);
                                                setTargetOrgId(org.id);
                                                setComboboxOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedOrg === org.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {org.name}
                                        </CommandItem>
                                            ))}
                                        </CommandList>
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Button
                            onClick={() => handleDuplicate(selectedOrg)}
                            disabled={!selectedOrg || isDuplicating || isLoadingOrgs}
                            className="w-full"
                            variant="outline"
                        >
                            {isDuplicating ? "Duplicating..." : `Duplicate to selected organization`}
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isDuplicating}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
