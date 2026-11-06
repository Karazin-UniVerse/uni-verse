import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@grip/i18n/LanguageContext';

export function withQueryClient(
  element: React.ReactElement,
  client: QueryClient,
): React.ReactElement {
  return React.createElement(QueryClientProvider, { client }, element);
}

export function withLanguage(element: React.ReactElement): React.ReactElement {
  return React.createElement(LanguageProvider, null, element);
}
