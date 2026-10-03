import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_ENV_KEYS,
  type FeatureFlags,
} from '../../constants/features.ts';
import { mergeFeatureFlags, resolveEnvFeatureFlags } from '../features.ts';

describe('features utils', () => {
  describe('resolveEnvFeatureFlags', () => {
    test('falls back to DEFAULT_FEATURE_FLAGS when env is empty', () => {
      const flags = resolveEnvFeatureFlags({});

      assert.deepStrictEqual(flags, DEFAULT_FEATURE_FLAGS);
    });

    test('parses environment variables properly', () => {
      const env = {
        [FEATURE_ENV_KEYS.isMoodleIntegrationEnabled]: 'true',
        [FEATURE_ENV_KEYS.isEDeanEnabled]: 'false',
        [FEATURE_ENV_KEYS.isOpportunitiesPlatformEnabled]: '1',
      };

      const flags = resolveEnvFeatureFlags(env);

      assert.strictEqual(flags.isMoodleIntegrationEnabled, true);
      assert.strictEqual(flags.isEDeanEnabled, false);
      assert.strictEqual(flags.isOpportunitiesPlatformEnabled, true);
    });
  });

  describe('mergeFeatureFlags', () => {
    test('merges multiple overrides in priority order', () => {
      const base: FeatureFlags = {
        isMoodleIntegrationEnabled: false,
        isEDeanEnabled: true,
        isOpportunitiesPlatformEnabled: false,
      };

      const firstOverride = {
        isMoodleIntegrationEnabled: true,
      };

      const secondOverride = {
        isOpportunitiesPlatformEnabled: true,
        isEDeanEnabled: false,
      };

      const result = mergeFeatureFlags(base, firstOverride, secondOverride);

      assert.strictEqual(result.isMoodleIntegrationEnabled, true);
      assert.strictEqual(result.isEDeanEnabled, false);
      assert.strictEqual(result.isOpportunitiesPlatformEnabled, true);
    });

    test('ignores null or undefined overrides', () => {
      const base: FeatureFlags = {
        isMoodleIntegrationEnabled: false,
        isEDeanEnabled: true,
        isOpportunitiesPlatformEnabled: false,
      };

      const result = mergeFeatureFlags(base, null, undefined, { isMoodleIntegrationEnabled: true });

      assert.strictEqual(result.isMoodleIntegrationEnabled, true);
      assert.strictEqual(result.isEDeanEnabled, true);
    });
  });
});
