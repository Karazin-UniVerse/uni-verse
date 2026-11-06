import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { isBrowser } from '@core/utils/browser';
import { resetTestFeatureFlags } from '@uni-hub/utils/test-feature-flags';

afterEach(() => {
  cleanup();
  resetTestFeatureFlags();

  if (isBrowser()) {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  }
});
