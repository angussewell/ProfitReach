import './globals.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
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
  description: 'AI-powered outbound communication management',
  icons: {
    icon: [
      {
        url: '/MessageLM Icon.png?v=2',
        sizes: 'any',
        type: 'image/png'
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
        url: '/MessageLM Icon.png?v=2',
        type: 'image/png'
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
