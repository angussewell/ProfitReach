import './globals.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers/Providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Toaster } from '@/components/ui/toaster';
import { Metadata, Viewport } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff'
};

export const metadata: Metadata = {
  title: 'MessageLM',
  description: 'Automated outbound communication management with AI-enhanced capabilities',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon'
      },
      {
        url: '/MessageLM Icon.png?v=2',
        sizes: '32x32',
        type: 'image/png'
      },
      {
        url: '/MessageLM Icon.png?v=2',
        sizes: '16x16',
        type: 'image/png'
      }
    ],
    shortcut: [
      {
        url: '/favicon.ico',
        type: 'image/x-icon'
      }
    ],
    apple: [
      {
        url: '/MessageLM Icon.png?v=2',
        sizes: '180x180',
        type: 'image/png'
      }
    ]
  },
  manifest: '/site.webmanifest?v=2',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MessageLM',
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-config': '/browserconfig.xml?v=2'
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
        <meta name="theme-color" content="#ffffff" />
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
