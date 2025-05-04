'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ScenarioPicker } from './ScenarioPicker'; // Use the simple picker
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
}

interface ScenarioStepConfigProps {
  value: string[]; // Current selected scenario IDs from form
  onChange: (ids: string[]) => void; // Function to update form state
}

export function ScenarioStepConfig({ value: selectedIds, onChange }: ScenarioStepConfigProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scenarioNamesMap, setScenarioNamesMap] = useState<Record<string, string>>({});

  // Fetch scenarios when component mounts
  useEffect(() => {
    async function fetchScenarios() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/scenarios/simple');
        if (!response.ok) throw new Error('Failed to fetch scenarios');
        const data = await response.json();
        const fetchedScenarios = data.data || [];
        setScenarios(fetchedScenarios);

        // Build a map of id -> name for display purposes
        const nameMap: Record<string, string> = {};
        fetchedScenarios.forEach((s: Scenario) => {
          nameMap[s.id] = s.name;
        });
        setScenarioNamesMap(nameMap);
      } catch (error) {
        console.error('Error fetching scenarios:', error);
        // Handle error state if needed
      } finally {
        setIsLoading(false);
      }
    }
    fetchScenarios();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Define toggleScenario with useCallback to stabilize the reference
  const handleToggleScenario = useCallback((scenarioId: string) => {
    const newScenarioIds = selectedIds.includes(scenarioId)
      ? selectedIds.filter(id => id !== scenarioId)
      : [...selectedIds, scenarioId];
    
    // Call the onChange prop passed from the parent modal to update the form
    onChange(newScenarioIds); 
  }, [selectedIds, onChange]); // Dependencies: selectedIds and the onChange callback itself

  return (
    <div className="space-y-2">
      {isLoading ? (
         <p className="text-sm text-muted-foreground">Loading scenarios...</p>
      ) : (
        <ScenarioPicker
          scenarios={scenarios}
          selectedIds={selectedIds}
          onToggle={handleToggleScenario}
        />
      )}

      {/* Display selected scenarios as tags */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
          <span className="text-sm font-medium text-muted-foreground mr-2">Selected:</span>
          {selectedIds.map((id: string) => (
            <Badge
              key={id}
              variant="secondary"
              className="gap-1"
            >
              {scenarioNamesMap[id] || "Loading..."} {/* Use map for names */}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent potential parent clicks
                  handleToggleScenario(id); // Use the callback handler
                }}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Information about selection behavior */}
      <p className="text-sm text-muted-foreground mt-2">
        {selectedIds.length > 1
          ? "One scenario will be randomly selected from your pool when this step executes."
          : "Select multiple scenarios to enable random selection from a pool."}
      </p>
    </div>
  );
}
