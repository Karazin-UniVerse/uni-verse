import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LinkMoodleMode } from '@uni-hub/components/auth';
import { useMoodleLink, type UseMoodleLinkOptions } from './useMoodleLink';

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
  interface ConsumerProps {
    options?: UseMoodleLinkOptions;
    onReady: (hook: ReturnType<typeof useMoodleLink>) => void;
  }

  const TestConsumer: React.FC<ConsumerProps> = ({ options, onReady }) => {
    const hook = useMoodleLink(options);

    onReady(hook);

    return null;
  };

  const mountHook = (options: UseMoodleLinkOptions = {}) => {
    let captured: ReturnType<typeof useMoodleLink> | null = null;

    renderToString(
      React.createElement(TestConsumer, {
        options,
        onReady: (hook) => {
          captured = hook;
        },
      }),
    );

    return captured!;
  };

  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }

    vi.clearAllMocks();
  });

  it('initializes with default linked state when storage has no entry', () => {
    const res = mountHook();

    expect(res.isMoodleLinked).toBe(true);
    expect(res.isLinkModalOpen).toBe(false);
    expect(res.isUnlinkModalOpen).toBe(false);
    expect(res.linkModalMode).toBe(LinkMoodleMode.CONNECT);
  });

  it('initializes with false when storage has isMoodleLinked="false"', () => {
    mockStorage.isMoodleLinked = 'false';

    const res = mountHook();

    expect(res.isMoodleLinked).toBe(false);
  });

  it('provides handlers to open and close modals', () => {
    const res = mountHook();

    expect(typeof res.openLinkModal).toBe('function');
    expect(typeof res.closeLinkModal).toBe('function');
    expect(typeof res.openUnlinkModal).toBe('function');
    expect(typeof res.closeUnlinkModal).toBe('function');
  });

  it('executes handleLinkSuccess and redirects connectMoodle active tab to overview', () => {
    const onLinkSuccess = vi.fn();
    const setActiveKey = vi.fn();

    const res = mountHook({
      activeKey: 'connectMoodle',
      setActiveKey,
      onLinkSuccess,
    });

    res.handleLinkSuccess();

    expect(mockStorage.isMoodleLinked).toBe('true');
    expect(setActiveKey).toHaveBeenCalledWith('overview');
    expect(onLinkSuccess).toHaveBeenCalledTimes(1);
  });

  it('executes handleUnlinkSuccess and triggers onUnlinkSuccess callback', () => {
    const onUnlinkSuccess = vi.fn();

    const res = mountHook({
      onUnlinkSuccess,
    });

    res.handleUnlinkSuccess();

    expect(mockStorage.isMoodleLinked).toBe('false');
    expect(onUnlinkSuccess).toHaveBeenCalledTimes(1);
  });
});
