/**
 * Utility functions for handling form data type conversions before API submission.
 */

type TypeConversion = 'string' | 'number' | 'boolean' | 'array';

interface ConversionSchema {
  [key: string]: TypeConversion;
}

/**
 * Converts form data values to appropriate types based on a schema
 * and handles null/undefined/empty string values correctly.
 */
export function prepareFormDataForApi(
  formData: Record<string, any>,
  schema?: ConversionSchema
): Record<string, any> {
  const result: Record<string, any> = { ...formData };
  
  for (const key in result) {
    const value = result[key];
    
    // Skip undefined values
    if (value === undefined) {
      continue;
    }
    
    // Handle empty strings as null
    if (value === '') {
      result[key] = null;
      continue;
    }
    
    // If schema is provided, convert based on schema type
    if (schema && key in schema) {
      const expectedType = schema[key];
      
      switch (expectedType) {
        case 'number':
          // Convert to number if it's a string and is numeric
          if (typeof value === 'string' && !isNaN(Number(value))) {
            result[key] = Number(value);
          } else if (value === null || value === '') {
            result[key] = null;
          }
          break;
          
        case 'boolean':
          // Convert string 'true'/'false' to boolean
          if (typeof value === 'string') {
            if (value.toLowerCase() === 'true') result[key] = true;
            else if (value.toLowerCase() === 'false') result[key] = false;
          }
          break;
          
        case 'array':
          // Ensure value is an array
          if (!Array.isArray(value)) {
            if (value === null || value === '') {
              result[key] = [];
            } else {
              result[key] = [value];
            }
          }
          break;
      }
    } else {
      // Auto-detect and convert without schema
      if (typeof value === 'string') {
        // Try to convert numeric strings to numbers
        if (!isNaN(Number(value)) && value.trim() !== '') {
          result[key] = Number(value);
        }
        // Convert 'true'/'false' strings to booleans
        else if (value.toLowerCase() === 'true') {
          result[key] = true;
        } else if (value.toLowerCase() === 'false') {
          result[key] = false;
        }
      }
    }
  }
  
  return result;
}

/**
 * Prepares workflow form data with specific field type conversions
 */
export function prepareWorkflowFormData(formData: Record<string, any>): Record<string, any> {
  return prepareFormDataForApi(formData, {
    dailyContactLimit: 'number',
    // Add other workflow-specific fields needing conversion here
  });
}
