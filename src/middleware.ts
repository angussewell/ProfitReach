import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token
  },
});

export const config = {
  matcher: [
    '/scenarios/:path*',
    '/settings/:path*',
    '/webhooks/:path*',
    '/prompts/:path*',
    '/research/:path*',
  ],
}; 