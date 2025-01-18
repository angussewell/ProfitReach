// Type for variable mapping
export type VariableMap = {
  [key: string]: string;
};

/**
 * Extracts variables from text that match the pattern {variable_name} or {{variable_name}}
 * @param text The text to extract variables from
 * @returns Array of variable names without the curly braces
 */
export function extractVariables(text: string): string[] {
  const singleBraceRegex = /{([^{}]+)}/g;
  const doubleBraceRegex = /{{([^{}]+)}}/g;
  
  const singleBraceMatches = text.match(singleBraceRegex) || [];
  const doubleBraceMatches = text.match(doubleBraceRegex) || [];
  
  const allMatches = [...singleBraceMatches, ...doubleBraceMatches];
  return allMatches.map(match => match.replace(/[{}]/g, '')); // Remove all curly braces
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
    // Normalize the key by removing any existing curly braces
    const normalizedKey = key.replace(/[{}]/g, '');
    
    // Replace both single and double brace formats
    result = result.replace(new RegExp(`{${normalizedKey}}`, 'g'), value);
    result = result.replace(new RegExp(`{{${normalizedKey}}}`, 'g'), value);
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
    try {
      // Remove all curly braces from the key
      const normalizedKey = key.replace(/[{}]/g, '');
      
      // Convert value to string, handling null/undefined
      const normalizedValue = value != null ? String(value) : '';
      
      normalized[normalizedKey] = normalizedValue;
    } catch (error) {
      console.error(`Error normalizing variable ${key}:`, error);
      // Skip invalid entries but continue processing
    }
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
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const processed: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    try {
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
    } catch (error) {
      console.error(`Error processing variable ${key}:`, error);
      processed[key] = value; // Preserve original value on error
    }
  });
  
  return processed;
} 