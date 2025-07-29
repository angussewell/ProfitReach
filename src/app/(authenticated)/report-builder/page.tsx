import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import ReportBuilderClient from './ReportBuilderClient';

export const metadata: Metadata = {
  title: 'Report Builder | ProfitReach',
  description: 'Create and manage report configurations for webhook automation',
};

export default async function ReportBuilderPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!session.user?.organizationId) {
    redirect('/');
  }

  return <ReportBuilderClient />;
}