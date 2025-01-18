// Type for variable mapping
export type VariableMap = {
  [key: string]: string;
};

/**
 * Extracts variables from text that match the pattern {variable_name}
 * @param text The text to extract variables from
 * @returns Array of variable names without the curly braces
 */
export function extractVariables(text: string): string[] {
  const variableRegex = /{([^{}]+)}/g;
  const matches = text.match(variableRegex) || [];
  return matches.map(match => match.slice(1, -1)); // Remove { and }
}

/**
 * Replaces variables in text with their corresponding values
 * @param text The text containing variables to replace
 * @param variables Object mapping variable names to their values
 * @returns Text with variables replaced with their values
 */
export function replaceVariables(text: string, variables: VariableMap): string {
  let result = text;
  
  // Replace each variable with its value
  Object.entries(variables).forEach(([key, value]) => {
    // Handle both with and without curly braces in the variables object
    const variableWithBraces = key.startsWith('{') ? key : `{${key}}`;
    const variableWithoutBraces = key.startsWith('{') ? key.slice(1, -1) : key;
    
    // Replace both formats in the text
    result = result.replace(new RegExp(`{${variableWithoutBraces}}`, 'g'), value);
    result = result.replace(new RegExp(`{{${variableWithoutBraces}}}`, 'g'), value);
  });
  
  return result;
}

/**
 * Normalizes variable names in an object by removing curly braces
 * @param data Object containing variable names as keys
 * @returns Object with normalized variable names
 */
export function normalizeVariables(data: Record<string, any>): VariableMap {
  const normalized: VariableMap = {};
  
  Object.entries(data).forEach(([key, value]) => {
    // Remove curly braces if present
    const normalizedKey = key.replace(/[{}]/g, '');
    normalized[normalizedKey] = String(value);
  });
  
  return normalized;
}

/**
 * Processes an object by replacing variables in all string values
 * @param obj Object containing strings that may have variables
 * @param variables Object mapping variable names to their values
 * @returns New object with all variables replaced in string values
 */
export function processObjectVariables(
  obj: Record<string, any>,
  variables: VariableMap
): Record<string, any> {
  const processed: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'string') {
      processed[key] = replaceVariables(value, variables);
    } else if (Array.isArray(value)) {
      processed[key] = value.map(item => 
        typeof item === 'string' ? replaceVariables(item, variables) : item
      );
    } else if (value && typeof value === 'object') {
      processed[key] = processObjectVariables(value, variables);
    } else {
      processed[key] = value;
    }
  });
  
  return processed;
} 