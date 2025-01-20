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
export function normalizeVariables(data: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Remove curly braces from keys if they exist
    const normalizedKey = key.replace(/[{}]/g, '');
    normalized[normalizedKey] = value;
  }
  
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

/**
 * Recursively searches for a value in an object using various field name formats
 */
function findValueInData(data: any, field: string): string | undefined {
  // Remove any template syntax
  const cleanField = field.replace(/[{}]/g, '').toLowerCase();
  
  // Different case variations to try
  const variations = [
    cleanField,                          // original (lowercase)
    cleanField.replace(/[_-]/g, ''),     // removed separators
    cleanField.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), // camelCase
    cleanField.replace(/([A-Z])/g, '_$1').toLowerCase(), // snake_case
  ];

  // Log what we're searching for
  console.log('Searching for field:', {
    original: field,
    cleaned: cleanField,
    variations
  });

  // Try each variation
  for (const variant of variations) {
    // Direct match at any level
    if (variant in data) {
      console.log('Found direct match:', { variant, value: data[variant] });
      return data[variant];
    }

    // Look in contactData
    if (data.contactData?.[variant] !== undefined) {
      console.log('Found in contactData:', { variant, value: data.contactData[variant] });
      return data.contactData[variant];
    }

    // Look in contact
    if (data.contact?.[variant] !== undefined) {
      console.log('Found in contact:', { variant, value: data.contact[variant] });
      return data.contact[variant];
    }
  }

  // If no match found, recursively search nested objects
  for (const key in data) {
    if (typeof data[key] === 'object' && data[key] !== null) {
      const found = findValueInData(data[key], field);
      if (found !== undefined) {
        console.log('Found in nested object:', { key, field, value: found });
        return found;
      }
    }
  }

  console.log('No value found for field:', field);
  return undefined;
}

/**
 * Processes webhook data and replaces variables in text
 * Completely independent of field mappings
 */
export function processWebhookVariables(text: string, webhookData: Record<string, any>): string {
  // Extract variables
  const variables = extractVariables(text);
  
  console.log('Processing variables:', {
    text,
    foundVariables: variables
  });

  // Create mapping
  const variableMap: VariableMap = {};
  variables.forEach(variable => {
    const value = findValueInData(webhookData, variable);
    if (value !== undefined) {
      variableMap[variable] = String(value);
    }
  });

  console.log('Variable mapping created:', variableMap);

  // Replace variables
  return replaceVariables(text, variableMap);
} 