import { FEATURE_ENV_KEYS, FEATURE_STORAGE_KEYS } from '@core/constants/features';
import { isBrowser } from '@core/utils/browser';

export function resetTestFeatureFlags(): void {
  for (const envKey of Object.values(FEATURE_ENV_KEYS)) {
    delete process.env[envKey];
  }

  if (isBrowser()) {
    window.localStorage?.removeItem(FEATURE_STORAGE_KEYS.OVERRIDES);
  }
}
