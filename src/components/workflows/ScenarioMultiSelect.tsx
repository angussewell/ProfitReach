'use client';

import React from 'react';

interface Scenario {
  id: string;
  name: string;
}

interface ScenarioMultiSelectProps {
  scenarios: Scenario[];
  value: string[]; // Currently selected IDs
  onChange: (ids: string[]) => void; // Callback with the new array of selected IDs
  isLoading?: boolean; // Optional loading state
}

export function ScenarioMultiSelect({ 
  scenarios, 
  value, 
  onChange, 
  isLoading = false 
}: ScenarioMultiSelectProps) {

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = event.target.selectedOptions;
    const selectedIds = Array.from(selectedOptions).map(option => option.value);
    onChange(selectedIds);
  };

  return (
    <div className="flex flex-col space-y-1.5">
      <label htmlFor="scenario-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Select scenario(s) (Ctrl/Cmd + Click for multiple)
      </label>
      <select
        id="scenario-select"
        multiple
        size={8} // Show 8 options at a time
        value={value} // Controlled component: value is the array of selected IDs
        onChange={handleSelectChange}
        disabled={isLoading}
        className="flex h-auto w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        // Using className for basic styling instead of inline style
      >
        {isLoading ? (
          <option disabled>Loading scenarios...</option>
        ) : scenarios.length === 0 ? (
           <option disabled>No scenarios available.</option>
        ) : (
          scenarios.map(scenario => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
