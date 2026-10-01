import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_ENV_KEYS,
  type FeatureFlags,
} from '../../constants/features.ts';
import {
  mergeFeatureFlags,
  parseBooleanFlag,
  parseFeatureQueryParams,
  resolveEnvFeatureFlags,
} from '../features.ts';

describe('features utils', () => {
  describe('parseBooleanFlag', () => {
    test('returns boolean value unchanged', () => {
      assert.strictEqual(parseBooleanFlag(true, false), true);
      assert.strictEqual(parseBooleanFlag(false, true), false);
    });

    test('parses truthy strings', () => {
      assert.strictEqual(parseBooleanFlag('true', false), true);
      assert.strictEqual(parseBooleanFlag('TRUE', false), true);
      assert.strictEqual(parseBooleanFlag('1', false), true);
      assert.strictEqual(parseBooleanFlag('yes', false), true);
      assert.strictEqual(parseBooleanFlag('on', false), true);
    });

    test('parses falsy strings', () => {
      assert.strictEqual(parseBooleanFlag('false', true), false);
      assert.strictEqual(parseBooleanFlag('FALSE', true), false);
      assert.strictEqual(parseBooleanFlag('0', true), false);
      assert.strictEqual(parseBooleanFlag('no', true), false);
      assert.strictEqual(parseBooleanFlag('off', true), false);
    });

    test('falls back to default for invalid inputs', () => {
      assert.strictEqual(parseBooleanFlag('invalid', true), true);
      assert.strictEqual(parseBooleanFlag(undefined, false), false);
      assert.strictEqual(parseBooleanFlag(null, true), true);
    });
  });

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

  describe('parseFeatureQueryParams', () => {
    test('parses discrete query params correctly', () => {
      const parsed = parseFeatureQueryParams('?ft_moodle=true&ft_opportunities=1&ft_edean=0');

      assert.strictEqual(parsed.isMoodleIntegrationEnabled, true);
      assert.strictEqual(parsed.isOpportunitiesPlatformEnabled, true);
      assert.strictEqual(parsed.isEDeanEnabled, false);
    });

    test('parses URLSearchParams object', () => {
      const searchParams = new URLSearchParams('ft_moodle=false');
      const parsed = parseFeatureQueryParams(searchParams);

      assert.strictEqual(parsed.isMoodleIntegrationEnabled, false);
    });

    test('supports shortcut list ?features=moodle,opportunities', () => {
      const parsed = parseFeatureQueryParams('?features=moodle,opportunities');

      assert.strictEqual(parsed.isMoodleIntegrationEnabled, true);
      assert.strictEqual(parsed.isOpportunitiesPlatformEnabled, true);
      assert.strictEqual(parsed.isEDeanEnabled, undefined);
    });

    test('supports shortcut disable ?disable=moodle,edean', () => {
      const parsed = parseFeatureQueryParams('?disable=moodle,edean');

      assert.strictEqual(parsed.isMoodleIntegrationEnabled, false);
      assert.strictEqual(parsed.isEDeanEnabled, false);
    });
  });

  describe('mergeFeatureFlags', () => {
    test('merges multiple overrides in priority order', () => {
      const base: FeatureFlags = {
        isMoodleIntegrationEnabled: false,
        isEDeanEnabled: true,
        isOpportunitiesPlatformEnabled: false,
      };

      const storageOverride = {
        isMoodleIntegrationEnabled: true,
      };

      const queryOverride = {
        isOpportunitiesPlatformEnabled: true,
        isEDeanEnabled: false,
      };

      const result = mergeFeatureFlags(base, storageOverride, queryOverride);

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
