import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  FEATURE_ENV_KEYS,
  FEATURE_STORAGE_KEYS,
  type FeatureFlagKey,
  type FeatureFlags,
} from '@core/constants/features';
import { ToastProvider } from '@una';
import { FeatureToggleProvider } from '@uni-hub/features';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';

export const ALL_FEATURES_ENABLED: Readonly<FeatureFlags> = Object.freeze({
  isMoodleIntegrationEnabled: true,
  isEDeanEnabled: true,
  isOpportunitiesPlatformEnabled: true,
  isFeaturePanelEnabled: true,
});

export function setTestFeatureFlags(flags: Partial<FeatureFlags>): void {
  for (const [key, envKey] of Object.entries(FEATURE_ENV_KEYS) as [FeatureFlagKey, string][]) {
    const value = flags[key];

    if (value === undefined) {
      continue;
    }

    process.env[envKey] = String(value);
  }
}

export function resetTestFeatureFlags(): void {
  for (const envKey of Object.values(FEATURE_ENV_KEYS)) {
    delete process.env[envKey];
  }

  if (typeof window !== 'undefined') {
    window.localStorage?.removeItem(FEATURE_STORAGE_KEYS.OVERRIDES);
  }
}

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

export function withFeatureToggles(
  element: React.ReactElement,
  flags?: Partial<FeatureFlags>,
): React.ReactElement {
  if (flags) {
    setTestFeatureFlags(flags);
  }

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

export function createLanguageWrapper(): React.FC<{ children: React.ReactNode }> {
  return ({ children }: { children: React.ReactNode }): React.ReactElement =>
    withLanguage(React.createElement(React.Fragment, null, children));
}

export function createQueryClientWrapper(
  queryClient: QueryClient = createTestQueryClient(),
): React.FC<{ children: React.ReactNode }> {
  return ({ children }: { children: React.ReactNode }): React.ReactElement =>
    withQueryClient(React.createElement(React.Fragment, null, children), queryClient);
}

export function createAppProvidersWrapper(
  queryClient: QueryClient = createTestQueryClient(),
): React.FC<{ children: React.ReactNode }> {
  return ({ children }: { children: React.ReactNode }): React.ReactElement =>
    withAppProviders(React.createElement(React.Fragment, null, children), queryClient);
}
