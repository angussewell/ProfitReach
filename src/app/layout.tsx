import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NextAuthProvider } from '@/components/providers/NextAuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ProfitReach',
  description: 'Manage your outreach campaigns effectively',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background`} suppressHydrationWarning>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
