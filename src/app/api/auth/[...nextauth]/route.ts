import NextAuth from 'next-auth';
import { authOptions } from './auth.config';

console.log('NextAuth route initialized');

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 