'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TagSelector from '@/components/filters/TagSelector';
import { LEAD_STATUS_OPTIONS } from '@/lib/field-definitions';
import { normalizeUrl } from '@/lib/utils';

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string;
  title: string | null;
  currentCompanyName: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  githubUrl: string | null;
  headline: string | null;
  state: string | null;
  city: string | null;
  country: string | null;
  emailStatus: string | null;
  companyLinkedinUrl: string | null;
  companyWebsiteUrl: string | null;
  phoneNumbers: any | null;
  contactEmails: any | null;
  additionalData: any | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  organizationId: string | null;
  leadStatus: string | null;
  status: string; // Combined status from leadStatus or additionalData.status
  tags?: string[]; // Array of tag names
  
  // Newly added fields
  phone: string | null;
  prospectResearch: string | null;
  companyResearch: string | null;
  previousMessageCopy: string | null;
  previousMessageSubjectLine: string | null;
  previousMessageId: string | null;
  threadId: string | null;
  emailSender: string | null;
  originalOutboundRepName: string | null;
  dateOfResearch: Date | null;
  allEmployees: string | null;
  linkedInPosts: string | null;
  linkedInProfilePhoto: string | null;
  initialLinkedInMessageCopy: string | null;
  providerId: string | null;
  mutualConnections: string | null;
  additionalResearch: string | null;
  currentScenario: string | null;
  outboundRepName: string | null;
  seoDescription: string | null;
};

type ContactFormData = {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  currentCompanyName: string;
  companyWebsiteUrl: string;
  companyLinkedinUrl: string;
  leadStatus: string;
  linkedinUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  githubUrl: string;
  country: string;
  city: string;
  state: string;
  phoneNumber: string;
  additionalDataJson: string;
  tags: string[];
  
  // Newly added fields
  phone: string;
  prospectResearch: string;
  companyResearch: string;
  previousMessageCopy: string;
  previousMessageSubjectLine: string;
  previousMessageId: string;
  threadId: string;
  emailSender: string;
  originalOutboundRepName: string;
  dateOfResearch: string;
  allEmployees: string;
  linkedInPosts: string;
  linkedInProfilePhoto: string;
  initialLinkedInMessageCopy: string;
  providerId: string;
  mutualConnections: string;
  additionalResearch: string;
  currentScenario: string;
  outboundRepName: string;
  seoDescription: string;
};

type EditContactFormProps = {
  contact: Contact;
};

// Format date for display

// Format date for display
const formatDate = (date: Date | null): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
};

export default function EditContactForm({ contact }: EditContactFormProps) {
  const router = useRouter();
  
  // Format additional data for editing
  const formattedAdditionalData = contact.additionalData 
    ? JSON.stringify(contact.additionalData, null, 2) 
    : '{}';
  
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    email: contact.email,
    title: contact.title || '',
    currentCompanyName: contact.currentCompanyName || '',
    companyWebsiteUrl: contact.companyWebsiteUrl || '',
    companyLinkedinUrl: contact.companyLinkedinUrl || '',
    leadStatus: contact.status || 'New', // Use combined status
    linkedinUrl: contact.linkedinUrl || '',
    twitterUrl: contact.twitterUrl || '',
    facebookUrl: contact.facebookUrl || '',
    githubUrl: contact.githubUrl || '',
    country: contact.country || '',
    city: contact.city || '',
    state: contact.state || '',
    phoneNumber: contact.phoneNumbers?.main || '',
    additionalDataJson: formattedAdditionalData,
    tags: contact.tags || [],
    
    // Newly added fields with fallbacks to empty strings
    phone: contact.phone || '',
    prospectResearch: contact.prospectResearch || '',
    companyResearch: contact.companyResearch || '',
    previousMessageCopy: contact.previousMessageCopy || '',
    previousMessageSubjectLine: contact.previousMessageSubjectLine || '',
    previousMessageId: contact.previousMessageId || '',
    threadId: contact.threadId || '',
    emailSender: contact.emailSender || '',
    originalOutboundRepName: contact.originalOutboundRepName || '',
    dateOfResearch: contact.dateOfResearch ? new Date(contact.dateOfResearch).toISOString().slice(0, 16) : '',
    allEmployees: contact.allEmployees || '',
    linkedInPosts: contact.linkedInPosts || '',
    linkedInProfilePhoto: contact.linkedInProfilePhoto || '',
    initialLinkedInMessageCopy: contact.initialLinkedInMessageCopy || '',
    providerId: contact.providerId || '',
    mutualConnections: contact.mutualConnections || '',
    additionalResearch: contact.additionalResearch || '',
    currentScenario: contact.currentScenario || '',
    outboundRepName: contact.outboundRepName || '',
    seoDescription: contact.seoDescription || '',
  });
  
  const [errors, setErrors] = useState<Partial<ContactFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [additionalDataError, setAdditionalDataError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactFormData> = {};

    const normalizedWebsite = normalizeUrl(formData.companyWebsiteUrl);
    if (normalizedWebsite === null) {
      newErrors.companyWebsiteUrl = 'Please enter a valid website URL';
    }

    // Validate JSON only - removed email and name checks
    try {
      if (formData.additionalDataJson) {
        JSON.parse(formData.additionalDataJson);
      }
      setAdditionalDataError(null);
    } catch (e) {
      setErrors(newErrors);
      setAdditionalDataError('Invalid JSON format');
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear the error for this field when the user types
    if (errors[name as keyof ContactFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Clear JSON error if editing the JSON textarea
    if (name === 'additionalDataJson') {
      setAdditionalDataError(null);
    }
  };
  
  // Handle tag selection changes
  const handleTagsChange = (selectedTags: string[]) => {
    setFormData(prev => ({ ...prev, tags: selectedTags }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse additionalData from JSON string
      let parsedAdditionalData = {};
      try {
        parsedAdditionalData = JSON.parse(formData.additionalDataJson);
      } catch (error) {
        // This should be caught by validation, but just in case
        setSubmitError('Invalid JSON in additional data');
        setIsSubmitting(false);
        return;
      }

      // Prepare phoneNumbers object
      const phoneNumbers = formData.phoneNumber ? { main: formData.phoneNumber } : null;

      const normalizedCompanyWebsiteUrl = normalizeUrl(formData.companyWebsiteUrl);
      if (normalizedCompanyWebsiteUrl === null) {
        setErrors(prev => ({ ...prev, companyWebsiteUrl: 'Please enter a valid website URL' }));
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Basic information
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          title: formData.title,
          currentCompanyName: formData.currentCompanyName,
          companyWebsiteUrl: normalizedCompanyWebsiteUrl,
          companyLinkedinUrl: formData.companyLinkedinUrl,
          leadStatus: formData.leadStatus,
          linkedinUrl: formData.linkedinUrl,
          twitterUrl: formData.twitterUrl,
          facebookUrl: formData.facebookUrl,
          githubUrl: formData.githubUrl,
          country: formData.country,
          city: formData.city,
          state: formData.state,
          phoneNumbers: phoneNumbers,
          additionalData: parsedAdditionalData,
          tags: formData.tags,
          
          // New dedicated phone field (separate from phoneNumbers object)
          phone: formData.phone,
          
          // Research information
          prospectResearch: formData.prospectResearch,
          companyResearch: formData.companyResearch,
          dateOfResearch: formData.dateOfResearch || null,
          additionalResearch: formData.additionalResearch,
          allEmployees: formData.allEmployees,
          
          // Message history
          previousMessageCopy: formData.previousMessageCopy,
          previousMessageSubjectLine: formData.previousMessageSubjectLine,
          previousMessageId: formData.previousMessageId,
          threadId: formData.threadId,
          emailSender: formData.emailSender,
          
          // LinkedIn information
          linkedInPosts: formData.linkedInPosts,
          linkedInProfilePhoto: formData.linkedInProfilePhoto,
          initialLinkedInMessageCopy: formData.initialLinkedInMessageCopy,
          providerId: formData.providerId,
          mutualConnections: formData.mutualConnections,
          
          // Sales information
          originalOutboundRepName: formData.originalOutboundRepName,
          outboundRepName: formData.outboundRepName,
          currentScenario: formData.currentScenario,
          
          // SEO
          seoDescription: formData.seoDescription,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.message || 'Failed to update contact');
      }

      // Success!
      setSubmitSuccess(true);
      setErrors(prev => ({ ...prev, companyWebsiteUrl: undefined }));
      setFormData(prev => ({
        ...prev,
        companyWebsiteUrl: responseData?.companyWebsiteUrl ?? (normalizedCompanyWebsiteUrl || ''),
      }));
      
      // Refresh and redirect after a short delay
      setTimeout(() => {
        router.refresh();
        router.push('/contacts');
      }, 1500);
    } catch (error) {
      console.error('Error updating contact:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      {submitSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
          Contact updated successfully! Redirecting...
        </div>
      )}

      {submitError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="mb-4">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email {/* Removed asterisk */}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  // Removed required attribute
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="leadStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Status {/* Removed asterisk */}
                </label>
                <select
                  id="leadStatus"
                  name="leadStatus"
                  value={formData.leadStatus || ''} // Ensure value is controlled even if null/undefined
                  onChange={handleChange}
                  // Removed required attribute
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.leadStatus ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  {/* Add a default "None" option */}
                  <option value="">-- Select Status --</option> 
                  {LEAD_STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.leadStatus && (
                  <p className="mt-1 text-sm text-red-600">{errors.leadStatus}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tags Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Tags</h3>
          </div>
          
          <div className="p-4 pb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Tags
            </label>
            <TagSelector 
              selectedTags={formData.tags} 
              onChange={handleTagsChange} 
              placeholder="Select or create tags..."
            />
            <p className="mt-2 text-xs text-gray-500">
              Add tags to categorize and filter your contacts. Click to select existing tags or type to create new ones.
            </p>
          </div>
        </div>

        {/* Professional Information Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Professional Information</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="currentCompanyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  id="currentCompanyName"
                  name="currentCompanyName"
                  value={formData.currentCompanyName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  id="linkedinUrl"
                  name="linkedinUrl"
                  value={formData.linkedinUrl}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Company Information Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="mb-4">
                <label htmlFor="companyWebsiteUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Website URL
                </label>
                <input
                  type="text"
                  id="companyWebsiteUrl"
                  name="companyWebsiteUrl"
                  value={formData.companyWebsiteUrl}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.companyWebsiteUrl ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.companyWebsiteUrl && (
                  <p className="mt-1 text-sm text-red-600">{errors.companyWebsiteUrl}</p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="companyLinkedinUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Company LinkedIn URL
                </label>
                <input
                  type="url"
                  id="companyLinkedinUrl"
                  name="companyLinkedinUrl"
                  value={formData.companyLinkedinUrl}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/company/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Social Media</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="mb-4">
                <label htmlFor="twitterUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Twitter URL
                </label>
                <input
                  type="url"
                  id="twitterUrl"
                  name="twitterUrl"
                  value={formData.twitterUrl}
                  onChange={handleChange}
                  placeholder="https://twitter.com/username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="facebookUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Facebook URL
                </label>
                <input
                  type="url"
                  id="facebookUrl"
                  name="facebookUrl"
                  value={formData.facebookUrl}
                  onChange={handleChange}
                  placeholder="https://facebook.com/username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="githubUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  GitHub URL
                </label>
                <input
                  type="url"
                  id="githubUrl"
                  name="githubUrl"
                  value={formData.githubUrl}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location Information Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="mb-4">
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Research Information Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Prospect Research</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="mb-4">
                <label htmlFor="prospectResearch" className="block text-sm font-medium text-gray-700 mb-1">
                  Prospect Research
                </label>
                <textarea
                  id="prospectResearch"
                  name="prospectResearch"
                  value={formData.prospectResearch}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Research notes about this prospect..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="additionalResearch" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Research
                </label>
                <textarea
                  id="additionalResearch"
                  name="additionalResearch"
                  value={formData.additionalResearch}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional research notes..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="companyResearch" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Research
                </label>
                <textarea
                  id="companyResearch"
                  name="companyResearch"
                  value={formData.companyResearch}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Research notes about the company..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="allEmployees" className="block text-sm font-medium text-gray-700 mb-1">
                  All Employees
                </label>
                <textarea
                  id="allEmployees"
                  name="allEmployees"
                  value={formData.allEmployees}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="List of known employees..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="dateOfResearch" className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Research
                </label>
                <input
                  type="datetime-local"
                  id="dateOfResearch"
                  name="dateOfResearch"
                  value={formData.dateOfResearch}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="seoDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  SEO Description
                </label>
                <textarea
                  id="seoDescription"
                  name="seoDescription"
                  value={formData.seoDescription}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SEO description from website..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* LinkedIn Information Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">LinkedIn Details</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="mb-4">
                <label htmlFor="linkedInPosts" className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Posts
                </label>
                <textarea
                  id="linkedInPosts"
                  name="linkedInPosts"
                  value={formData.linkedInPosts}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Recent LinkedIn posts..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="initialLinkedInMessageCopy" className="block text-sm font-medium text-gray-700 mb-1">
                  Initial LinkedIn Message Copy
                </label>
                <textarea
                  id="initialLinkedInMessageCopy"
                  name="initialLinkedInMessageCopy"
                  value={formData.initialLinkedInMessageCopy}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Copy of initial LinkedIn message..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="linkedInProfilePhoto" className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Profile Photo URL
                </label>
                <input
                  type="url"
                  id="linkedInProfilePhoto"
                  name="linkedInProfilePhoto"
                  value={formData.linkedInProfilePhoto}
                  onChange={handleChange}
                  placeholder="https://example.com/profile-photo.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="providerId" className="block text-sm font-medium text-gray-700 mb-1">
                  Provider ID
                </label>
                <input
                  type="text"
                  id="providerId"
                  name="providerId"
                  value={formData.providerId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="LinkedIn provider ID..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="mutualConnections" className="block text-sm font-medium text-gray-700 mb-1">
                  Mutual Connections
                </label>
                <textarea
                  id="mutualConnections"
                  name="mutualConnections"
                  value={formData.mutualConnections}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="List of mutual connections..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Message History Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Message History</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="mb-4">
                <label htmlFor="previousMessageCopy" className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Message Copy
                </label>
                <textarea
                  id="previousMessageCopy"
                  name="previousMessageCopy"
                  value={formData.previousMessageCopy}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Copy of previous message..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="previousMessageSubjectLine" className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Message Subject Line
                </label>
                <input
                  type="text"
                  id="previousMessageSubjectLine"
                  name="previousMessageSubjectLine"
                  value={formData.previousMessageSubjectLine}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Subject line of previous message..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="previousMessageId" className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Message ID
                </label>
                <input
                  type="text"
                  id="previousMessageId"
                  name="previousMessageId"
                  value={formData.previousMessageId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID of previous message..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="threadId" className="block text-sm font-medium text-gray-700 mb-1">
                  Thread ID
                </label>
                <input
                  type="text"
                  id="threadId"
                  name="threadId"
                  value={formData.threadId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Thread ID..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="emailSender" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Sender
                </label>
                <input
                  type="text"
                  id="emailSender"
                  name="emailSender"
                  value={formData.emailSender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email address of sender..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sales Information Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Sales Information</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="mb-4">
                <label htmlFor="originalOutboundRepName" className="block text-sm font-medium text-gray-700 mb-1">
                  Original Outbound Rep Name
                </label>
                <input
                  type="text"
                  id="originalOutboundRepName"
                  name="originalOutboundRepName"
                  value={formData.originalOutboundRepName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Name of original outbound rep..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="outboundRepName" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Outbound Rep Name
                </label>
                <input
                  type="text"
                  id="outboundRepName"
                  name="outboundRepName"
                  value={formData.outboundRepName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Name of current outbound rep..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="currentScenario" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Scenario
                </label>
                <input
                  type="text"
                  id="currentScenario"
                  name="currentScenario"
                  value={formData.currentScenario}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Current sales scenario..."
                />
              </div>

              <div className="mb-4">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Direct Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Direct phone number..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* System Information Card - Read Only */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">System Information</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Created At
                </label>
                <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                  {formatDate(contact.createdAt)}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Updated
                </label>
                <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                  {formatDate(contact.updatedAt)}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization ID
                </label>
                <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                  {contact.organizationId || 'N/A'}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact ID
                </label>
                <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                  {contact.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Data Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Additional Data (JSON)</h3>
          </div>
          
          <div className="p-4">
            <textarea
              id="additionalDataJson"
              name="additionalDataJson"
              value={formData.additionalDataJson}
              onChange={handleChange}
              rows={10}
              className={`w-full px-3 py-2 border rounded-md font-mono text-sm ${
                additionalDataError ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {additionalDataError && (
              <p className="mt-1 text-sm text-red-600">{additionalDataError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Edit the JSON directly. Be careful to maintain valid JSON format.
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => router.push('/contacts')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Contact'}
          </button>
        </div>
      </form>
    </div>
  );
}
