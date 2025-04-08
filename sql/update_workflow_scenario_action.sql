-- Function to handle the "scenario" action type in workflow steps
-- This function will be called by the workflow execution engine
-- It selects a random scenario from the provided list and updates the contact's scenarioName field

CREATE OR REPLACE FUNCTION handle_scenario_workflow_action(
  p_contact_id TEXT,
  p_scenario_ids TEXT[],
  p_assignment_type TEXT
)
RETURNS VOID AS $$
DECLARE
  v_scenario_name TEXT;
  v_selected_scenario_id TEXT;
BEGIN
  -- Validate the input
  IF p_scenario_ids IS NULL OR array_length(p_scenario_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No scenario IDs provided for scenario action';
  END IF;

  -- Handle different assignment types
  IF p_assignment_type = 'single' OR array_length(p_scenario_ids, 1) = 1 THEN
    -- If single assignment or only one scenario, use the first one
    v_selected_scenario_id := p_scenario_ids[1];
  ELSIF p_assignment_type = 'random_pool' THEN
    -- If random pool and multiple scenarios, randomly select one
    v_selected_scenario_id := p_scenario_ids[floor(random() * array_length(p_scenario_ids, 1)) + 1];
  ELSE
    RAISE EXCEPTION 'Invalid assignment type: %', p_assignment_type;
  END IF;

  -- Get the name of the selected scenario
  SELECT name INTO v_scenario_name
  FROM "Scenario"
  WHERE id = v_selected_scenario_id;

  IF v_scenario_name IS NULL THEN
    RAISE EXCEPTION 'Selected scenario ID not found: %', v_selected_scenario_id;
  END IF;

  -- Update the contact's scenarioName field
  UPDATE "Contacts"
  SET "scenarioName" = v_scenario_name,
      "updatedAt" = NOW()
  WHERE id = p_contact_id;

  -- Log this action in the workflow execution log (assuming the log exists and is called by the workflow engine)
  -- This would be handled by the workflow execution engine itself

END;
$$ LANGUAGE plpgsql;

-- Usage example:
-- SELECT handle_scenario_workflow_action('contact-123', ARRAY['scenario-1', 'scenario-2'], 'random_pool');
