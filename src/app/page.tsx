export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/login');
  }
  
  redirect('/scenarios');
  return null;
}