import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LinkMoodleMode } from '@uni-hub/components/auth';
import { useMoodleLink } from './useMoodleLink';

const mockStorage: Record<string, string> = {};

vi.mock('@uni-hub/utils/browser', () => ({
  isBrowser: true,
}));

vi.mock('@uni-hub/services/api', () => ({
  safeStorage: {
    getItem: vi.fn((key: string) => mockStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
    }),
  },
}));

describe('useMoodleLink hook', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }

    vi.clearAllMocks();
  });

  it('should initialize with default linked state when storage has no entry', () => {
    const { result } = renderHook(() => useMoodleLink());

    expect(result.current.isMoodleLinked).toBe(true);
    expect(result.current.isLinkModalOpen).toBe(false);
    expect(result.current.isUnlinkModalOpen).toBe(false);
    expect(result.current.linkModalMode).toBe(LinkMoodleMode.CONNECT);
  });

  it('should initialize with false when storage has isMoodleLinked="false"', () => {
    mockStorage.isMoodleLinked = 'false';

    const { result } = renderHook(() => useMoodleLink());

    expect(result.current.isMoodleLinked).toBe(false);
  });

  it('should provide handlers to open and close modals', () => {
    const { result } = renderHook(() => useMoodleLink());

    expect(typeof result.current.openLinkModal).toBe('function');
    expect(typeof result.current.closeLinkModal).toBe('function');
    expect(typeof result.current.openUnlinkModal).toBe('function');
    expect(typeof result.current.closeUnlinkModal).toBe('function');
  });

  it('should execute handleLinkSuccess and redirect connectMoodle active tab to overview', () => {
    const onLinkSuccess = vi.fn();
    const setActiveKey = vi.fn();

    const { result } = renderHook(() =>
      useMoodleLink({
        activeKey: 'connectMoodle',
        setActiveKey,
        onLinkSuccess,
      }),
    );

    act(() => {
      result.current.handleLinkSuccess();
    });

    expect(mockStorage.isMoodleLinked).toBe('true');
    expect(setActiveKey).toHaveBeenCalledWith('overview');
    expect(onLinkSuccess).toHaveBeenCalledTimes(1);
  });

  it('should execute handleUnlinkSuccess and trigger onUnlinkSuccess callback', () => {
    const onUnlinkSuccess = vi.fn();

    mockStorage.universe_dashboard_data = '{"courses":[]}';
    mockStorage.universe_last_sync_time = '1000';

    const { result } = renderHook(() =>
      useMoodleLink({
        onUnlinkSuccess,
      }),
    );

    act(() => {
      result.current.handleUnlinkSuccess();
    });

    expect(mockStorage.isMoodleLinked).toBe('false');
    expect(mockStorage.universe_dashboard_data).toBeUndefined();
    expect(mockStorage.universe_last_sync_time).toBeUndefined();
    expect(onUnlinkSuccess).toHaveBeenCalledTimes(1);
  });
});
