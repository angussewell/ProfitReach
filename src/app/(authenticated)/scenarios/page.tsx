// Server Component
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { ScenariosClient } from './client';

export default function ScenariosPage() {
  return <ScenariosClient />;
} 