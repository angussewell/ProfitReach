import './globals.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { ToasterProvider } from '@/components/providers/toaster-provider';
import { Metadata, Viewport } from 'next';
import React from 'react';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff'
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'TempShift',
  description: 'Automated outbound communication management with AI-enhanced capabilities',
  icons: {
    icon: [
      { url: '/tempshift_new_favicon_2025.ico', sizes: 'any' }
    ],
    apple: '/tempshift_new_favicon_2025.ico',
    shortcut: '/tempshift_new_favicon_2025.ico'
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TempShift',
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-config': '/browserconfig.xml?v=6',
    // Add the mobile-web-app-capable meta tag
    'mobile-web-app-capable': 'yes'
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
        <link rel="icon" href="/tempshift_new_favicon_2025.ico" />
        <link rel="shortcut icon" href="/tempshift_new_favicon_2025.ico" />
        <link rel="apple-touch-icon" href="/tempshift_new_favicon_2025.ico" />
        {/* Force no-cache for favicon - fix httpEquiv property names */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <React.Fragment>
          <Providers>{children}</Providers>
          <ToasterProvider />
        </React.Fragment>
      </body>
    </html>
  );
}
