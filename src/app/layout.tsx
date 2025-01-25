import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ProfitReach',
  description: 'AI-powered cold outreach automation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script 
          src="https://marketplace.gohighlevel.com/js/oauth_sdk.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-background`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
