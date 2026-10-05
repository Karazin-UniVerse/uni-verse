import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';
import '@uni-hub/index.css';
import '@ui/vars.scss';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'UniHub | Karazin UniVerse',
  description: 'Студентський навчальний портал Karazin UniHub',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // intentional: suppressHydrationWarning – theme class injected by inline script before hydration causes expected server/client mismatch on <html>
  return (
    <html
      lang="uk"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
