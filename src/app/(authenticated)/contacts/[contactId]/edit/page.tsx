import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import EditContactForm from '@/components/contacts/EditContactForm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Constants
const PLACEHOLDER_ORG_ID = 'org_test_alpha'; // Fallback for testing

// Function to fetch the contact data
async function getContact(contactId: string) {
  try {
    // Get the organization ID from the session
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId || PLACEHOLDER_ORG_ID;
    
    console.log('Fetching contact with ID:', contactId, 'for organization:', organizationId);

    // Fetch the contact 
    const contact = await prisma.contacts.findUnique({
      where: {
        id: contactId,
        organizationId, // Security check: ensure the contact belongs to this organization
      },
    });
    
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

    // Get lead status from additionalData for now, until Prisma client is refreshed
    let status = '';
    
    // Try to get leadStatus from database via SQL directly (not currently possible through Prisma)
    // For now we'll fall back to additionalData
    if (contact.additionalData && typeof contact.additionalData === 'object') {
      const additionalData = contact.additionalData as any;
      status = additionalData.status || '';
    }

    // Extract tags from the query result
    const tags = Array.isArray(contactTags) ? contactTags.map((tag: any) => tag.name) : [];

    return {
      ...contact,
      status,
      leadStatus: null, // Add this to match the Contact type requirements
      // Handle social media fields that might not exist yet in database
      twitterUrl: contact?.twitterUrl || null,
      facebookUrl: contact?.facebookUrl || null,
      githubUrl: contact?.githubUrl || null,
      // Add tags to the contact object
      tags
    };
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

      <div className="bg-white rounded-lg shadow-md">
        <EditContactForm contact={contact} />
      </div>
    </PageContainer>
  );
}
