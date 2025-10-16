import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import PipelineClient from './PipelineClient';

export default async function PipelinePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    redirect('/auth/signin?callbackUrl=/pipeline');
  }

  if (session.user.role !== 'admin') {
    redirect('/');
  }

  return <PipelineClient />;
}
