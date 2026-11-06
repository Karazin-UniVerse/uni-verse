import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { FEATURE_ENV_KEYS } from '@core/constants/features';
import { isBrowser } from '@core/utils/browser';

afterEach(() => {
  cleanup();

  for (const envKey of Object.values(FEATURE_ENV_KEYS)) {
    delete process.env[envKey];
  }

  if (isBrowser()) {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  }
});
