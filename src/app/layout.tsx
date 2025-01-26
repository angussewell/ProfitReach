import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers/Providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'ProfitReach',
  description: 'AI-powered outbound communication management'
};

// Suppress hydration warnings caused by browser extensions modifying the DOM
// @see https://nextjs.org/docs/messages/react-hydration-error
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
