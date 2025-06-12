'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input'; // Use existing Input for styling
import { Checkbox } from '@/components/ui/checkbox'; // Use existing Checkbox for styling

interface Scenario {
  id: string;
  name: string;
}

interface ScenarioPickerProps {
  scenarios: Scenario[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function ScenarioPicker({ scenarios, selectedIds, onToggle }: ScenarioPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredScenarios = useMemo(() => {
    if (!searchTerm) {
      return scenarios;
    }
    return scenarios.filter(scenario =>
      scenario.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [scenarios, searchTerm]);

  return (
    <div className="flex flex-col gap-2">
      <Input
        type="text"
        placeholder="Search scenarios..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2" // Add some margin below search
      />
      <div className="max-h-[250px] overflow-y-auto border rounded-md p-2"> {/* Scrollable container */}
        {filteredScenarios.length > 0 ? (
          <ul className="space-y-1">
            {filteredScenarios.map((scenario) => (
              <li
                key={scenario.id}
                onClick={() => onToggle(scenario.id)}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent cursor-pointer" // Make entire li clickable
              >
                <Checkbox
                  id={`scenario-${scenario.id}`}
                  checked={selectedIds.includes(scenario.id)}
                  // Remove readOnly and onCheckedChange as parent li handles the click
                  aria-labelledby={`scenario-label-${scenario.id}`}
                />
                <span id={`scenario-label-${scenario.id}`} className="text-sm">
                  {scenario.name}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center p-4">No scenarios found.</p>
        )}
      </div>
    </div>
  );
}
