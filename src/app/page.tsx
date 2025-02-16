export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/scenarios');
}