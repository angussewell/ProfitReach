import NextAuth from 'next-auth';
import { authOptions } from './auth.config';

console.log('[NextAuth] Route initialized with config:', {
  providers: authOptions.providers.map(p => p.id),
  hasDebug: authOptions.debug,
  hasPages: !!authOptions.pages,
  callbacks: Object.keys(authOptions.callbacks || {}),
});

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 