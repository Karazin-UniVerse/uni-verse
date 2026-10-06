import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, describe } from 'node:test';
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_ENV_KEYS,
  FEATURE_STORAGE_KEYS,
  type FeatureFlags,
} from '../../constants/features.ts';
import {
  createOverrideStore,
  mergeFeatureFlags,
  readStoredOverrides,
  removeStoredOverrides,
  resolveEnvFeatureFlags,
  writeStoredOverrides,
} from '../features.ts';

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
        [FEATURE_ENV_KEYS.isFeaturePanelEnabled]: 'true',
      };

      const flags = resolveEnvFeatureFlags(env);

      assert.strictEqual(flags.isMoodleIntegrationEnabled, true);
      assert.strictEqual(flags.isEDeanEnabled, false);
      assert.strictEqual(flags.isOpportunitiesPlatformEnabled, true);
      assert.strictEqual(flags.isFeaturePanelEnabled, true);
    });
  });

  describe('mergeFeatureFlags', () => {
    test('merges multiple overrides in priority order', () => {
      const base: FeatureFlags = {
        isMoodleIntegrationEnabled: false,
        isEDeanEnabled: true,
        isOpportunitiesPlatformEnabled: false,
        isFeaturePanelEnabled: false,
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
        isFeaturePanelEnabled: false,
      };

      const result = mergeFeatureFlags(base, null, undefined, { isMoodleIntegrationEnabled: true });

      assert.strictEqual(result.isMoodleIntegrationEnabled, true);
      assert.strictEqual(result.isEDeanEnabled, true);
    });
  });

  describe('storage helpers and createOverrideStore', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
      mockStorage = {};

      const mockLocalStorage = {
        getItem: (key: string): string | null => mockStorage[key] ?? null,
        setItem: (key: string, value: string): void => {
          mockStorage[key] = value;
        },
        removeItem: (key: string): void => {
          delete mockStorage[key];
        },
        clear: (): void => {
          mockStorage = {};
        },
        key: (): null => null,
        length: 0,
      };

      (globalThis as unknown as { window?: unknown }).window = {
        localStorage: mockLocalStorage,
        addEventListener: (): void => {},
        removeEventListener: (): void => {},
      };
    });

    afterEach(() => {
      delete (globalThis as unknown as { window?: unknown }).window;
    });

    test('returns null when storage is empty or invalid JSON', () => {
      assert.strictEqual(readStoredOverrides(), null);

      mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES] = 'invalid-json';
      assert.strictEqual(readStoredOverrides(), null);

      mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES] = '["array"]';
      assert.strictEqual(readStoredOverrides(), null);
    });

    test('reads valid boolean overrides and writes overrides to localStorage', () => {
      writeStoredOverrides({ isOpportunitiesPlatformEnabled: true });
      assert.strictEqual(
        mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES],
        JSON.stringify({ isOpportunitiesPlatformEnabled: true }),
      );

      const parsed = readStoredOverrides();

      assert.strictEqual(parsed?.isOpportunitiesPlatformEnabled, true);

      removeStoredOverrides();
      assert.strictEqual(mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES], undefined);
      assert.strictEqual(readStoredOverrides(), null);
    });

    test('createOverrideStore subscribes, notifies listeners, and handles overrides', () => {
      const store = createOverrideStore({ allowOverrides: true });
      let notified = false;
      const unsubscribe = store.subscribe(() => {
        notified = true;
      });

      store.setOverride('isOpportunitiesPlatformEnabled', true);
      assert.strictEqual(notified, true);
      assert.strictEqual(store.getSnapshot().isOpportunitiesPlatformEnabled, true);

      unsubscribe();
    });

    test('createOverrideStore blocks overrides when allowOverrides is false (production safeguard)', () => {
      mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES] = JSON.stringify({
        isOpportunitiesPlatformEnabled: true,
      });

      const store = createOverrideStore({ allowOverrides: false });
      const snapshot = store.getSnapshot();

      assert.strictEqual(snapshot.isOpportunitiesPlatformEnabled, undefined);

      store.setOverride('isOpportunitiesPlatformEnabled', true);
      assert.strictEqual(store.getSnapshot().isOpportunitiesPlatformEnabled, undefined);
    });
  });
});
