import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FEATURE_STORAGE_KEYS } from '@core/constants/features';
import {
  createOverrideStore,
  getEnvDefaults,
  readStoredOverrides,
  removeStoredOverrides,
  writeStoredOverrides,
} from './helpers';

describe('features helpers', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};

    const mockLocalStorage: Storage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      key: () => null,
      length: 0,
    };

    (global as unknown as { window?: unknown }).window = {
      localStorage: mockLocalStorage,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });

  afterEach(() => {
    delete (global as unknown as { window?: unknown }).window;
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    delete process.env.NEXT_PUBLIC_FEATURE_EDEAN;
    delete process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES;
    delete process.env.NEXT_PUBLIC_FEATURE_PANEL;
  });

  describe('readStoredOverrides and writeStoredOverrides', () => {
    it('returns null when storage is empty or invalid JSON', () => {
      expect(readStoredOverrides()).toBeNull();

      mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES] = 'invalid-json';
      expect(readStoredOverrides()).toBeNull();

      mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES] = '["array"]';
      expect(readStoredOverrides()).toBeNull();
    });

    it('reads valid boolean overrides and writes overrides to localStorage', () => {
      writeStoredOverrides({ isOpportunitiesPlatformEnabled: true });
      expect(mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES]).toBe(
        JSON.stringify({ isOpportunitiesPlatformEnabled: true }),
      );

      const parsed = readStoredOverrides();

      expect(parsed?.isOpportunitiesPlatformEnabled).toBe(true);

      removeStoredOverrides();
      expect(mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES]).toBeUndefined();
      expect(readStoredOverrides()).toBeNull();
    });
  });

  describe('getEnvDefaults', () => {
    it('reads NEXT_PUBLIC environment variables correctly', () => {
      process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';
      process.env.NEXT_PUBLIC_FEATURE_EDEAN = 'true';
      process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES = 'false';
      process.env.NEXT_PUBLIC_FEATURE_PANEL = 'true';

      const flags = getEnvDefaults();

      expect(flags.isMoodleIntegrationEnabled).toBe(true);
      expect(flags.isEDeanEnabled).toBe(true);
      expect(flags.isOpportunitiesPlatformEnabled).toBe(false);
      expect(flags.isFeaturePanelEnabled).toBe(true);
    });
  });

  describe('createOverrideStore', () => {
    it('subscribes and notifies listeners on change', () => {
      const store = createOverrideStore({ allowOverrides: true });
      let notified = false;
      const unsubscribe = store.subscribe(() => {
        notified = true;
      });

      store.setOverride('isOpportunitiesPlatformEnabled', true);
      expect(notified).toBe(true);
      expect(store.getSnapshot().isOpportunitiesPlatformEnabled).toBe(true);

      unsubscribe();
    });
  });
});
