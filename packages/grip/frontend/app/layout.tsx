import type { ReactNode } from 'react';
import { LanguageProvider } from '@grip/i18n/LanguageContext';
import { GripDeveloperProvider } from '@grip/views/dev-tools/grip/GripDeveloperProvider';
import '@ui/vars.scss';
import './globals.css';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="uk">
      <body>
        <LanguageProvider>
          <GripDeveloperProvider>{children}</GripDeveloperProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
