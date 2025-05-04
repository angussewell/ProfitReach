import React from 'react';
import prisma from '@/lib/prisma'; // Import Prisma client

interface OrgContactStat {
  organization_name: string;
  total_contacts: number;
  available_contacts: number;
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
            },
          },
        },
        // Available contacts (same email criteria plus date criteria)
        Contacts: {
          where: {
            email: { not: null },
            emailStatus: {
              notIn: ['NOT_FOUND', 'unsafe', 'email_disabled'],
            },
            OR: [
              { dateOfResearch: null },
              { dateOfResearch: { lt: twoMonthsAgo } }
            ]
          },
          select: {
            id: true,
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Map Prisma result to the component's expected format
    data = organizationsWithCounts.map((org) => ({
      organization_name: org.name,
      total_contacts: org._count.Contacts, // Access count via capitalized name
      available_contacts: org.Contacts.length, // Count available contacts
    }));

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
