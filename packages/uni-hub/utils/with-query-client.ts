import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@una';
import { FeatureToggleProvider } from '@uni-hub/features';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function withQueryClient(
  element: React.ReactElement,
  queryClient: QueryClient = createTestQueryClient(),
): React.ReactElement {
  return React.createElement(QueryClientProvider, { client: queryClient }, element);
}

export function withLanguage(element: React.ReactElement): React.ReactElement {
  return React.createElement(LanguageProvider, null, element);
}

export function withTheme(element: React.ReactElement): React.ReactElement {
  return React.createElement(ThemeProvider, null, element);
}

export function withFeatureToggles(element: React.ReactElement): React.ReactElement {
  return React.createElement(FeatureToggleProvider, null, element);
}

export function withToast(element: React.ReactElement): React.ReactElement {
  return React.createElement(ToastProvider, null, element);
}

export function withAppProviders(
  element: React.ReactElement,
  queryClient: QueryClient = createTestQueryClient(),
): React.ReactElement {
  return withQueryClient(
    withToast(withTheme(withLanguage(withFeatureToggles(element)))),
    queryClient,
  );
}

export function createQueryClientWrapper(
  queryClient: QueryClient = createTestQueryClient(),
): React.FC<{ children: React.ReactNode }> {
  return ({ children }: { children: React.ReactNode }): React.ReactElement =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

export function createAppProvidersWrapper(
  queryClient: QueryClient = createTestQueryClient(),
): React.FC<{ children: React.ReactNode }> {
  return ({ children }: { children: React.ReactNode }): React.ReactElement =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(FeatureToggleProvider, null, children),
          ),
        ),
      ),
    );
}
