/**
 * Centralized field definitions for Contact fields
 * This ensures consistency across all components that need to reference Contact fields
 */

// Define lead status options for consistent usage across components
export const LEAD_STATUS_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Connected', label: 'Connected' },
  { value: 'Meeting Booked', label: 'Meeting Booked' },
  { value: 'Email Bounced', label: 'Email Bounced' },
  { value: 'Left Company', label: 'Left Company' },
  { value: 'Abandoned', label: 'Abandoned' },
];

// Define field groups for better organization
export const FIELD_GROUPS = {
  PERSONAL: 'Personal Information',
  CONTACT: 'Contact Information',
  COMPANY: 'Company Information',
  SOCIAL: 'Social Media',
  LOCATION: 'Location',
  SYSTEM: 'System Fields',
  CUSTOM: 'Custom Fields',
  RESEARCH: 'Research & Intelligence',
  OUTREACH: 'Outreach & Communication',
  OTHER: 'Other Fields',
};

// Field option interface
export interface FieldOption {
  value: string;
  label: string;
  group: string;
}

/**
 * Comprehensive list of all Contact fields with proper labels and grouping
 * Based on the Prisma schema and existing UI components
 */
export const CONTACT_FIELDS: FieldOption[] = [
  // Personal Information
  { value: "firstName", label: "First Name", group: FIELD_GROUPS.PERSONAL },
  { value: "lastName", label: "Last Name", group: FIELD_GROUPS.PERSONAL },
  { value: "fullName", label: "Full Name", group: FIELD_GROUPS.PERSONAL },
  { value: "photoUrl", label: "Photo URL", group: FIELD_GROUPS.PERSONAL },
  { value: "headline", label: "Headline/Bio", group: FIELD_GROUPS.PERSONAL },
  { value: "title", label: "Job Title", group: FIELD_GROUPS.PERSONAL },
  
  // Contact Information
  { value: "email", label: "Email Address", group: FIELD_GROUPS.CONTACT },
  { value: "emailStatus", label: "Email Status", group: FIELD_GROUPS.CONTACT },
  { value: "phone", label: "Phone", group: FIELD_GROUPS.CONTACT },
  { value: "phoneNumbers.main", label: "Phone Number (Main)", group: FIELD_GROUPS.CONTACT },
  { value: "phoneNumbers.mobile", label: "Phone Number (Mobile)", group: FIELD_GROUPS.CONTACT },
  { value: "phoneNumbers.work", label: "Phone Number (Work)", group: FIELD_GROUPS.CONTACT },
  { value: "phoneNumbers.other", label: "Phone Number (Other)", group: FIELD_GROUPS.CONTACT },
  { value: "lastActivityAt", label: "Last Activity Date", group: FIELD_GROUPS.CONTACT },
  
  // Company Information
  { value: "currentCompanyName", label: "Company Name", group: FIELD_GROUPS.COMPANY },
  { value: "currentCompanyId", label: "Company ID", group: FIELD_GROUPS.COMPANY },
  { value: "companyWebsiteUrl", label: "Company Website", group: FIELD_GROUPS.COMPANY },
  { value: "companyLinkedinUrl", label: "Company LinkedIn URL", group: FIELD_GROUPS.COMPANY },
  { value: "propertyCount", label: "Number of Properties", group: FIELD_GROUPS.COMPANY },
  { value: "pms", label: "Property Management System", group: FIELD_GROUPS.COMPANY },
  
  // Social Media
  { value: "linkedinUrl", label: "LinkedIn URL", group: FIELD_GROUPS.SOCIAL },
  { value: "twitterUrl", label: "Twitter URL", group: FIELD_GROUPS.SOCIAL },
  { value: "facebookUrl", label: "Facebook URL", group: FIELD_GROUPS.SOCIAL },
  { value: "githubUrl", label: "GitHub URL", group: FIELD_GROUPS.SOCIAL },
  { value: "linkedInProfilePhoto", label: "LinkedIn Profile Photo", group: FIELD_GROUPS.SOCIAL },
  { value: "linkedInPosts", label: "LinkedIn Posts", group: FIELD_GROUPS.SOCIAL },
  
  // Location
  { value: "city", label: "City", group: FIELD_GROUPS.LOCATION },
  { value: "state", label: "State/Province", group: FIELD_GROUPS.LOCATION },
  { value: "country", label: "Country", group: FIELD_GROUPS.LOCATION },
  
  // System Fields
  { value: "leadStatus", label: "Lead Status", group: FIELD_GROUPS.SYSTEM },
  { value: "tags", label: "Tags", group: FIELD_GROUPS.SYSTEM },
  { value: "providerId", label: "Provider ID", group: FIELD_GROUPS.SYSTEM },
  { value: "scenarioName", label: "Scenario Name", group: FIELD_GROUPS.SYSTEM },
  { value: "currentScenario", label: "Current Scenario", group: FIELD_GROUPS.SYSTEM },
  
  // Research & Intelligence
  { value: "prospectResearch", label: "Prospect Research", group: FIELD_GROUPS.RESEARCH },
  { value: "companyResearch", label: "Company Research", group: FIELD_GROUPS.RESEARCH },
  { value: "dateOfResearch", label: "Research Date", group: FIELD_GROUPS.RESEARCH },
  { value: "allEmployees", label: "All Employees", group: FIELD_GROUPS.RESEARCH },
  { value: "additionalResearch", label: "Additional Research", group: FIELD_GROUPS.RESEARCH },
  { value: "seoDescription", label: "SEO Description", group: FIELD_GROUPS.RESEARCH },
  { value: "mutualConnections", label: "Mutual Connections", group: FIELD_GROUPS.RESEARCH },
  
  // Outreach & Communication
  { value: "previousMessageCopy", label: "Previous Message Copy", group: FIELD_GROUPS.OUTREACH },
  { value: "previousMessageSubjectLine", label: "Previous Subject Line", group: FIELD_GROUPS.OUTREACH },
  { value: "previousMessageId", label: "Previous Message ID", group: FIELD_GROUPS.OUTREACH },
  { value: "threadId", label: "Thread ID", group: FIELD_GROUPS.OUTREACH },
  { value: "emailSender", label: "Email Sender", group: FIELD_GROUPS.OUTREACH },
  { value: "originalOutboundRepName", label: "Original Outbound Rep", group: FIELD_GROUPS.OUTREACH },
  { value: "initialLinkedInMessageCopy", label: "Initial LinkedIn Message", group: FIELD_GROUPS.OUTREACH },
  { value: "outboundRepName", label: "Outbound Rep Name", group: FIELD_GROUPS.OUTREACH },
  
  // Custom Fields
  { value: "additionalData.tag", label: "Tag (Custom Field)", group: FIELD_GROUPS.CUSTOM },
  { value: "additionalData.source", label: "Source (Custom Field)", group: FIELD_GROUPS.CUSTOM },
  { value: "additionalData.score", label: "Score (Custom Field)", group: FIELD_GROUPS.CUSTOM },
  { value: "additionalData.notes", label: "Notes (Custom Field)", group: FIELD_GROUPS.CUSTOM },
  { value: "additionalData.customField", label: "Custom Field", group: FIELD_GROUPS.CUSTOM },
];

/**
 * Helper utility functions to manipulate and filter fields
 */

// Get fields by group - useful for categorized dropdowns
export function getFieldsByGroup(group: string): FieldOption[] {
  return CONTACT_FIELDS.filter(field => field.group === group);
}

// Get all field groups with their fields
export function getGroupedFields(): { group: string, fields: FieldOption[] }[] {
  return Object.values(FIELD_GROUPS).map(group => ({
    group,
    fields: CONTACT_FIELDS.filter(field => field.group === group)
  }));
}

// Get all fields as a flat array with fully formatted labels
export function getFlattenedFields(): { value: string, label: string }[] {
  return CONTACT_FIELDS.map(field => ({
    value: field.value,
    label: `${field.label} (${field.group})`
  }));
}

// Get a simple list of field options (without grouping information)
export function getSimpleFieldOptions(): { value: string, label: string }[] {
  return CONTACT_FIELDS.map(field => ({
    value: field.value,
    label: field.label
  }));
}

// Get field label by value
export function getFieldLabel(value: string): string | undefined {
  const field = CONTACT_FIELDS.find(f => f.value === value);
  return field?.label;
}

// Get a subset of fields for simpler UIs (excludes complex or system fields)
export function getCommonFieldOptions(): { value: string, label: string }[] {
  // Define fields to include in common list
  const commonFieldValues = [
    'firstName', 'lastName', 'email', 'phone', 'title', 
    'currentCompanyName', 'leadStatus', 'city', 'state', 'country',
    'tags', 'lastActivityAt', 'prospectResearch', 'companyResearch'
  ];
  
  return CONTACT_FIELDS
    .filter(field => commonFieldValues.includes(field.value))
    .map(field => ({
      value: field.value,
      label: field.label
    }));
}
