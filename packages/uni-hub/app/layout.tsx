import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google';
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

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin', 'cyrillic'],
  preload: false,
});

export const metadata: Metadata = {
  title: 'UniHub | Karazin UniVerse',
  description: 'Студентський навчальний портал Karazin UniHub',
};

/**
 * Inline script executed synchronously before React hydration.
 * Applies the stored theme (user choice) or falls back to the OS colour-scheme preference:
 *   dark  OS preference → 'karazinGold'
 *   light OS preference → 'karazinClassic'
 *
 * Runs before first paint to prevent theme flash.
 * The <html> element has suppressHydrationWarning because server renders without
 * data-theme / data-color-scheme attributes, and this script adds them client-side.
 */
const THEME_INIT_SCRIPT = `
(function () {
  var KEY = 'universe-theme';
  var VALID = ['light','dark','cyberpunk','karazinClassic','universeSpace','karazinGold'];
  var LIGHT_THEMES = ['light','karazinClassic'];
  var stored = localStorage.getItem(KEY);
  var theme = (stored && VALID.indexOf(stored) !== -1)
    ? stored
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'karazinGold' : 'karazinClassic');
  var root = document.documentElement;
  root.dataset.colorScheme = LIGHT_THEMES.indexOf(theme) !== -1 ? 'light' : 'dark';
  if (theme === 'light') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
})();
`.trim();

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // intentional: suppressHydrationWarning – theme attributes injected by THEME_INIT_SCRIPT before hydration
  // cause an expected server/client mismatch on <html>; safe because the script runs synchronously.
  return (
    <html
      lang="uk"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable}`}
    >
      <head>
        {/* intentional: dangerouslySetInnerHTML is safe – THEME_INIT_SCRIPT contains no user input */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
