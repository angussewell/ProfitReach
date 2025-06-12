import React from 'react';
import prisma from '@/lib/prisma'; // Import Prisma client

interface OrgContactStat {
  organization_name: string;
  total_contacts: number;
  available_contacts: number;
  uncontacted_contacts: number; // Added new metric
  // Future metrics would be added here
  // future_metric_1?: number;
  // future_metric_2?: number;
}

export async function ContactsPerOrgStats() {
  let data: OrgContactStat[] = [];
  try {
    // Calculate date from 2 months ago for availability check
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    
    const organizationsWithCounts = await prisma.organization.findMany({
      where: {
        hideFromAdminStats: false,
      },
      select: {
        name: true,
        // Total contacts count (same criteria as before)
        _count: {
          select: {
            Contacts: { // Use capitalized relation name 'Contacts'
              where: {
                email: { not: null },
                emailStatus: {
                  notIn: ['NOT_FOUND', 'unsafe', 'email_disabled'],
                },
              },
            }, // End of Contacts count object
          }, // End of _count.select
        }, // End of _count object
        // Fetch relevant contact details for client-side filtering
        Contacts: {
          where: {
            // Base filter: must have an email
            email: { not: null },
            // Exclude universally bad statuses relevant to Total Contacts count
             emailStatus: {
               notIn: ['NOT_FOUND', 'unsafe', 'email_disabled'],
             },
          },
          select: {
            // Fields needed for Available and Uncontacted filtering
            id: true,
            emailStatus: true,
            dateOfResearch: true,
            previousMessageCopy: true,
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Map Prisma result to the component's expected format
    // Map Prisma result and perform client-side filtering for counts
    data = organizationsWithCounts.map((org) => {
      const allRelevantContacts = org.Contacts; // Contacts matching base criteria

      // Filter for Available Contacts
      const availableContacts = allRelevantContacts.filter(contact => 
        !['NOT_FOUND', 'unsafe', 'email_disabled'].includes(contact.emailStatus ?? '') && // Redundant check based on where clause, but safe
        (contact.dateOfResearch === null || contact.dateOfResearch < twoMonthsAgo)
      ).length;

      // Filter for Uncontacted Contacts
      const uncontactedContacts = allRelevantContacts.filter(contact =>
        !['email_disabled', 'dead_server', 'invalid_mx', 'spamtrap'].includes(contact.emailStatus ?? '') &&
        (contact.previousMessageCopy === null || contact.previousMessageCopy === '')
      ).length;

      return {
        organization_name: org.name,
        total_contacts: org._count.Contacts, // Use the direct count from Prisma
        available_contacts: availableContacts, // Use client-filtered count
        uncontacted_contacts: uncontactedContacts, // Use client-filtered count
      };
    });

  } catch (error) {
    console.error("Error fetching contacts per organization stats with Prisma:", error);
    // data remains an empty array
  }

  return (
    <div>
      <div className="border border-slate-200 shadow-sm rounded-md overflow-hidden bg-white">
        <div className="overflow-x-auto">
          {data.length === 0 ? (
            <div className="p-4 text-slate-500 italic">No organization data found.</div>
          ) : (
            <table className="w-full min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    Organization
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    Total Contacts
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    Available Contacts
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider whitespace-nowrap"
                    title="Contacts with email, not disabled/dead/invalid/spamtrap status, and no previous message sent."
                  >
                    Uncontacted Contacts
                  </th>
                  {/* Placeholder for future metrics */}
                  {/* 
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    Future Metric 1
                  </th>
                  */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {data.map((org, index) => (
                  <tr 
                    key={org.organization_name} 
                    className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-700">
                      {org.organization_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                      {org.total_contacts}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                      {org.available_contacts}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                      {org.uncontacted_contacts}
                    </td>
                    {/* Placeholder for future metrics */}
                    {/* 
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                      {org.future_metric_1 || '—'}
                    </td>
                    */}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
