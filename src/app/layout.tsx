import '@/styles/hubspot.css';
import { Lexend } from 'next/font/google';
import Providers from '@/components/providers/Providers';
import RootWrapper from '@/components/providers/RootWrapper';
import AppSidebar from '@/components/layout/AppSidebar';

const lexend = Lexend({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
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
    <html lang="en" className={lexend.variable}>
      <body suppressHydrationWarning>
        <RootWrapper>
          <Providers>
            <div className="flex min-h-screen">
              <AppSidebar />
              <main className="flex-1 p-6 bg-[#f5f8fa]">
                {children}
              </main>
            </div>
          </Providers>
        </RootWrapper>
      </body>
    </html>
  );
}
