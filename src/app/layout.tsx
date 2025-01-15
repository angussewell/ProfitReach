import './globals.css';
import { Lexend } from 'next/font/google';
import Providers from '@/components/providers/Providers';
import RootWrapper from '@/components/providers/RootWrapper';
import AppSidebar from '@/components/layout/AppSidebar';

const lexend = Lexend({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
  preload: true,
});

export const metadata = {
  title: 'HubSpot Campaign Dashboard',
  description: 'Track your HubSpot campaign performance',
  icons: {
    icon: '/hubspot-favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/_next/static/css/app/globals.css" />
      </head>
      <body className={`${lexend.variable} min-h-screen bg-[#f5f8fa] text-hubspot-blue font-sans antialiased`}>
        <RootWrapper>
          <Providers>
            <div className="flex min-h-screen">
              <AppSidebar />
              <main className="flex-1 p-6">
                {children}
              </main>
            </div>
          </Providers>
        </RootWrapper>
      </body>
    </html>
  );
}
