import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { isBrowser } from '@core/utils/browser';
import { resetTestFeatureFlags } from '@uni-hub/utils/test-utils';

afterEach(() => {
  cleanup();
  resetTestFeatureFlags();

  if (isBrowser()) {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  }
});
