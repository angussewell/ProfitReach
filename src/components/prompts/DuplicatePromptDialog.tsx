'use client';

import React, { useState, useEffect } from 'react';
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
import { useOrganization } from '@/contexts/OrganizationContext';

interface Prompt {
  id: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
}

async function fetchUserOrganizations(): Promise<Organization[]> {
    const response = await fetch('/api/organizations/list-mine');
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

async function duplicatePromptApiCall(promptId: string, targetOrganizationId: string): Promise<Prompt> {
    const response = await fetch(`/api/prompts/${promptId}/duplicate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetOrganizationId }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

interface DuplicatePromptDialogProps {
    isOpen: boolean;
    onClose: () => void;
    prompt: Prompt | null;
    refreshPrompts: () => void;
}

export function DuplicatePromptDialog({
    isOpen,
    onClose,
    prompt,
    refreshPrompts
}: DuplicatePromptDialogProps) {
    const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const { toast } = useToast();
    const { currentOrganization } = useOrganization();

    const currentUserOrgId = currentOrganization?.id;

    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<string | null>(targetOrgId ?? null);

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
        if (!prompt || !selectedTargetOrgId) return;
        setIsDuplicating(true);
        try {
            const duplicatedPrompt = await duplicatePromptApiCall(prompt.id, selectedTargetOrgId);
            toast({
                title: "Success",
                description: `Prompt '${duplicatedPrompt.name}' duplicated successfully!`,
            });
            refreshPrompts();
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
                    <DialogTitle>Duplicate Prompt: '{prompt?.name}'</DialogTitle>
                    <DialogDescription>
                        Choose where to duplicate this prompt.
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
