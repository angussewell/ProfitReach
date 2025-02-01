// Types
interface VariableMap {
  [key: string]: string;
}

class VariableReplacer {
  /**
   * Extracts variables from a text string
   * Variables are in the format {variable_name}
   */
  static extractVariables(text: string): string[] {
    const regex = /{([^}]+)}/g;
    const matches = text.match(regex) || [];
    return matches.map(match => match.slice(1, -1));
  }

  /**
   * Recursively searches for a value in an object using various field name formats
   */
  static findValueInData(data: any, field: string): string | undefined {
    // Remove any template syntax and convert to lowercase
    const cleanField = field.replace(/[{}]/g, '').toLowerCase();
    
    // Different case variations to try
    const variations = [
      cleanField,                          // original (lowercase)
      cleanField.replace(/\s+/g, '_'),     // spaces to underscores
      cleanField.replace(/[-\s]/g, '_'),   // any separator to underscore
      cleanField.replace(/[-\s_]/g, ''),   // remove all separators
      cleanField.replace(/\s+/g, ''),      // remove spaces
      // Convert to camelCase (handling spaces and underscores)
      cleanField.replace(/[-\s_](.)/g, (_, letter) => letter.toUpperCase()),
      // Convert to snake_case (handling spaces and camelCase)
      cleanField.replace(/\s+/g, '_').replace(/([A-Z])/g, '_$1').toLowerCase()
    ];

    // Remove duplicates
    const uniqueVariations = [...new Set(variations)];
    
    // Log what we're searching for
    console.log('Searching for field:', {
      original: field,
      cleaned: cleanField,
      variations: uniqueVariations
    });

    // Try each variation
    for (const variant of uniqueVariations) {
      // Try exact match at root level
      if (data[field] !== undefined) {
        console.log('Found exact match at root:', { field, value: data[field] });
        return data[field];
      }

      // Try variant match at root level
      if (data[variant] !== undefined) {
        console.log('Found variant match at root:', { variant, value: data[variant] });
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
        const found = this.findValueInData(data[key], field);
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
   * Replaces variables in a text string with values from a mapping
   */
  static async replaceVariables(text: string, data: VariableMap): Promise<string> {
    const variables = this.extractVariables(text);
    let result = text;

    for (const variable of variables) {
      const value = this.findValueInData(data, variable);
      if (value !== undefined) {
        result = result.replace(`{${variable}}`, value);
      }
    }

    return result;
  }
}

module.exports = VariableReplacer; 