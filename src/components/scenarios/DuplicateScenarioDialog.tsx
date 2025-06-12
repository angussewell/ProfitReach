'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// Remove Popover and Command imports
import { Check } from "lucide-react"; // Keep Check, remove ChevronsUpDown
import Select from 'react-select'; // Add react-select import
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from '@/contexts/OrganizationContext';

interface Scenario {
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

async function duplicateScenarioApiCall(scenarioId: string, targetOrganizationId: string): Promise<Scenario> {
    const response = await fetch(`/api/scenarios/${scenarioId}/duplicate`, {
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

interface DuplicateScenarioDialogProps {
    isOpen: boolean;
    onClose: () => void;
    scenario: Scenario | null;
    refreshScenarios: () => void;
}

export function DuplicateScenarioDialog({
    isOpen,
    onClose,
    scenario,
    refreshScenarios
}: DuplicateScenarioDialogProps) {
    const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const { toast } = useToast();
    const { currentOrganization } = useOrganization();

    const currentUserOrgId = currentOrganization?.id;

    // State for react-select
    const [selectedOrgOption, setSelectedOrgOption] = useState<{ value: string; label: string } | null>(null);
    // Keep targetOrgId for simplicity in handleDuplicate, update it when selectedOrgOption changes
    // const [isOrgSelectOpen, setIsOrgSelectOpen] = useState(false); // Remove - react-select handles its own state

    useEffect(() => {
        if (isOpen && currentUserOrgId) {
            setTargetOrgId(null);
            setSelectedOrgOption(null); // Reset react-select state
            // setIsOrgSelectOpen(false); // Remove
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
        if (!scenario || !selectedTargetOrgId) return;
        setIsDuplicating(true);
        try {
            const duplicatedScenario = await duplicateScenarioApiCall(scenario.id, selectedTargetOrgId);
            toast({
                title: "Success",
                description: `Scenario '${duplicatedScenario.name}' duplicated successfully!`,
            });
            refreshScenarios();
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
                    <DialogTitle>Duplicate Scenario: '{scenario?.name}'</DialogTitle>
                    <DialogDescription>
                        Choose where to duplicate this scenario.
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

                    {/* Option 2: Cross Org - React Select Implementation */}
                    <div className="space-y-2 pt-4 border-t">
                        <Label htmlFor="target-org-select">Or duplicate to another organization:</Label>
                        <Select
                            inputId="target-org-select"
                            options={otherOrganizations.map(org => ({ value: org.id, label: org.name }))}
                            value={selectedOrgOption}
                            onChange={(option) => {
                                setSelectedOrgOption(option);
                                // Update targetOrgId when selection changes
                                setTargetOrgId(option ? option.value : null);
                            }}
                            isLoading={isLoadingOrgs}
                            isClearable
                            isSearchable
                            placeholder={isLoadingOrgs ? "Loading organizations..." : "Search or select an organization..."}
                            noOptionsMessage={() => otherOrganizations.length === 0 && !isLoadingOrgs ? "No other organizations available" : "No organizations match your search"}
                            styles={{ // Basic styling to somewhat match shadcn - can be refined
                                control: (baseStyles, state) => ({
                                    ...baseStyles,
                                    borderColor: 'hsl(var(--input))',
                                    backgroundColor: 'hsl(var(--background))',
                                    boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--ring))' : 'none',
                                    '&:hover': {
                                        borderColor: 'hsl(var(--input))',
                                    }
                                }),
                                input: (baseStyles) => ({
                                    ...baseStyles,
                                    color: 'hsl(var(--foreground))',
                                }),
                                singleValue: (baseStyles) => ({
                                    ...baseStyles,
                                    color: 'hsl(var(--foreground))',
                                }),
                                menu: (baseStyles) => ({
                                    ...baseStyles,
                                    backgroundColor: 'hsl(var(--popover))',
                                    borderColor: 'hsl(var(--border))',
                                    borderWidth: '1px',
                                }),
                                option: (baseStyles, state) => ({
                                    ...baseStyles,
                                    backgroundColor: state.isSelected ? 'hsl(var(--accent))' : state.isFocused ? 'hsl(var(--accent) / 0.5)' : 'transparent',
                                    color: state.isSelected ? 'hsl(var(--accent-foreground))' : 'hsl(var(--popover-foreground))',
                                    '&:active': {
                                        backgroundColor: 'hsl(var(--accent))',
                                    },
                                }),
                                placeholder: (baseStyles) => ({
                                    ...baseStyles,
                                    color: 'hsl(var(--muted-foreground))',
                                }),
                                // Add more style overrides as needed
                            }}
                            // classNamePrefix="react-select" // Use if you want to target with global CSS
                        />
                        <Button
                            onClick={() => handleDuplicate(selectedOrgOption ? selectedOrgOption.value : null)}
                            disabled={!selectedOrgOption || isDuplicating || isLoadingOrgs}
                            className="w-full"
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
