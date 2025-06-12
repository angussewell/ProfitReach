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

// Define types locally for clarity
interface Workflow {
  workflowId: string; // Changed from id to workflowId
  name: string;
}

interface Organization {
  id: string;
  name: string;
}

// API call to fetch organizations (remains the same)
async function fetchUserOrganizations(): Promise<Organization[]> {
    const response = await fetch('/api/organizations/list-mine');
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// API call to duplicate workflow (UPDATED ENDPOINT)
async function duplicateWorkflowApiCall(workflowId: string, targetOrganizationId: string): Promise<Workflow> {
    // Use the correct workflow duplication endpoint
    const response = await fetch(`/api/workflows/${workflowId}/duplicate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetOrganizationId }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Provide a more specific error message
        throw new Error(errorData.error || `Workflow duplication failed: ${response.status}`);
    }
    // Assuming the response returns the duplicated workflow details
    const result = await response.json();
    // Ensure the response structure matches the expected Workflow type
    // Adjust if the API returns data differently (e.g., nested under a 'data' key)
    return result.data || result; 
}

interface DuplicateWorkflowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    workflow: Workflow | null; // Changed prop name
    refreshWorkflows: () => void; // Changed prop name
}

export function DuplicateWorkflowDialog({
    isOpen,
    onClose,
    workflow, // Changed prop name
    refreshWorkflows // Changed prop name
}: DuplicateWorkflowDialogProps) {
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
        if (!workflow || !selectedTargetOrgId) return; // Check workflow prop
        setIsDuplicating(true);
        try {
            // Use workflow.workflowId
            const duplicatedWorkflow = await duplicateWorkflowApiCall(workflow.workflowId, selectedTargetOrgId);
            toast({
                title: "Success",
                // Use duplicatedWorkflow.name
                description: `Workflow '${duplicatedWorkflow.name}' duplicated successfully!`,
            });
            refreshWorkflows(); // Call correct refresh prop
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
                    {/* Update title */}
                    <DialogTitle>Duplicate Workflow: '{workflow?.name}'</DialogTitle>
                    <DialogDescription>
                        {/* Update description */}
                        Choose where to duplicate this workflow.
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
                                    // Ensure button is not disabled while loading orgs, only the action button
                                >
                                    {isLoadingOrgs ? "Loading orgs..." : (selectedOrg
                                        ? otherOrganizations.find((org) => org.id === selectedOrg)?.name
                                        : "Select organization...")}
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
                                                setTargetOrgId(org.id); // Ensure targetOrgId is set here too
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
