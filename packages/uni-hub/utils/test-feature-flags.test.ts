import { describe, expect, it, vi } from 'vitest';
import { FEATURE_ENV_KEYS, FEATURE_STORAGE_KEYS } from '@core/constants/features';
import { setTestFeatureFlags } from './test-utils';
import { resetTestFeatureFlags } from './test-feature-flags';

describe('resetTestFeatureFlags', () => {
  it('should reset feature values and persisted overrides without clearing unrelated settings', () => {
    vi.stubEnv('TEST_UNRELATED_SETTING', 'preserved');
    setTestFeatureFlags({
      isMoodleIntegrationEnabled: true,
      isEDeanEnabled: true,
      isOpportunitiesPlatformEnabled: false,
      isFeaturePanelEnabled: true,
    });
    localStorage.setItem(FEATURE_STORAGE_KEYS.OVERRIDES, '{"isEDeanEnabled":true}');
    localStorage.setItem('unrelated-test-value', 'preserved');

    try {
      resetTestFeatureFlags();

      for (const envKey of Object.values(FEATURE_ENV_KEYS)) {
        expect(process.env[envKey]).toBeUndefined();
      }

      expect(localStorage.getItem(FEATURE_STORAGE_KEYS.OVERRIDES)).toBeNull();
      expect(localStorage.getItem('unrelated-test-value')).toBe('preserved');
      expect(process.env.TEST_UNRELATED_SETTING).toBe('preserved');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
