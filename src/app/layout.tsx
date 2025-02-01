import './globals.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers/Providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'ProfitReach',
  description: 'AI-powered outbound communication management',
  icons: {
    icon: '/MessageLM Icon.png',
  }
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
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers session={session}>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
