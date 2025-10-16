import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import EditContactForm from '@/components/contacts/EditContactForm';
import ContactCorrespondence from '@/components/contacts/ContactCorrespondence';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// Constants
const PLACEHOLDER_ORG_ID = 'org_test_alpha'; // Fallback for testing

// Function to fetch the contact data
async function getContact(contactId: string) {
  try {
    // Get the organization ID from the session
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId || PLACEHOLDER_ORG_ID;
    
    // Fetch the contact with all fields, including the newly added ones
    const contact = await prisma.contacts.findUnique({
      where: {
        id: contactId,
        organizationId, // Security check: ensure the contact belongs to this organization
      },
      // No need to explicitly select fields since findUnique automatically fetches all fields
    }) as any; // Cast to any to avoid TypeScript errors with new fields
    
    // Fetch the contact's tags using a raw query
    const contactTags = await prisma.$queryRaw`
      SELECT t.name 
      FROM "Tags" t
      JOIN "ContactTags" ct ON t.id = ct."tagId"
      WHERE ct."contactId" = ${contactId}
      AND t."organizationId" = ${organizationId}
    `;

    if (!contact) {
      return null;
    }

    // Get lead status from the new leadStatus field, or fall back to additionalData
    let status = contact.leadStatus || '';
    
    // If no leadStatus, try to get it from additionalData for backward compatibility
    if (!status && contact.additionalData && typeof contact.additionalData === 'object') {
      const additionalData = contact.additionalData as any;
      status = additionalData.status || '';
    }

    // Extract tags from the query result
    const tags = Array.isArray(contactTags) ? contactTags.map((tag: any) => tag.name) : [];

    // Create an enhanced contact object with all fields
    const enhancedContact = {
      ...contact,
      status,
      tags,
      
      // Ensure fields have fallbacks
      twitterUrl: contact?.twitterUrl || null,
      facebookUrl: contact?.facebookUrl || null,
      githubUrl: contact?.githubUrl || null,
      
      // These are the new fields - they exist in the database but TypeScript doesn't know about them yet
      phone: contact?.phone || null,
      prospectResearch: contact?.prospectResearch || null,
      companyResearch: contact?.companyResearch || null,
      previousMessageCopy: contact?.previousMessageCopy || null,
      previousMessageSubjectLine: contact?.previousMessageSubjectLine || null,
      previousMessageId: contact?.previousMessageId || null, 
      threadId: contact?.threadId || null,
      emailSender: contact?.emailSender || null,
      originalOutboundRepName: contact?.originalOutboundRepName || null,
      dateOfResearch: contact?.dateOfResearch || null,
      allEmployees: contact?.allEmployees || null,
      linkedInPosts: contact?.linkedInPosts || null,
      linkedInProfilePhoto: contact?.linkedInProfilePhoto || null,
      initialLinkedInMessageCopy: contact?.initialLinkedInMessageCopy || null,
      providerId: contact?.providerId || null,
      mutualConnections: contact?.mutualConnections || null,
      additionalResearch: contact?.additionalResearch || null,
      currentScenario: contact?.currentScenario || null,
      outboundRepName: contact?.outboundRepName || null,
      seoDescription: contact?.seoDescription || null
    };
    
    return enhancedContact;
  } catch (error) {
    console.error('Error fetching contact:', error);
    throw error;
  }
}

// The Edit Contact Page
export default async function EditContactPage({
  params,
}: {
  params: { contactId: string };
}) {
  const contactId = params.contactId;

  // Fetch the contact data
  const contact = await getContact(contactId);

  // If no contact is found for this ID and organization, return 404
  if (!contact) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Contact</h1>
        <p className="text-gray-600 mt-1">
          Update contact information for {contact.firstName || ''} {contact.lastName || ''}
        </p>
      </div>

      <Tabs
        defaultValue="details"
        className="bg-white rounded-lg shadow-md"
      >
        <TabsList className="flex w-full justify-start rounded-t-lg border-b border-slate-200 bg-slate-50 px-2 py-1.5">
          <TabsTrigger value="details" className="rounded-md px-3 py-1.5">
            Details
          </TabsTrigger>
          <TabsTrigger value="correspondence" className="rounded-md px-3 py-1.5">
            Correspondence
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="p-6">
          <EditContactForm contact={contact} />
        </TabsContent>
        <TabsContent value="correspondence" className="p-6">
          <ContactCorrespondence contactId={contact.id} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
