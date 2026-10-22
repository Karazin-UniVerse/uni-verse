import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';
import styles from './Toast.module.scss';
import type { ToastApi } from './Toast.types';

const ToastTrigger = ({ onReady }: { onReady?: (api: ToastApi) => void }) => {
  const toast = useToast();

  React.useEffect(() => {
    onReady?.(toast);
  }, [toast, onReady]);

  return (
    <div>
      <button type="button" onClick={() => toast.success('Success message')}>
        Trigger Success
      </button>
      <button type="button" onClick={() => toast.error('Error message')}>
        Trigger Error
      </button>
      <button type="button" onClick={() => toast.info('Info message')}>
        Trigger Info
      </button>
    </div>
  );
};

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render toast message when toast is triggered via useToast', () => {
    let api!: ToastApi;

    render(
      <ToastProvider>
        <ToastTrigger
          onReady={(toast) => {
            api = toast;
          }}
        />
      </ToastProvider>,
    );

    act(() => {
      api.info('Hello world notification');
    });

    expect(screen.getByText('Hello world notification')).toBeInTheDocument();
  });

  it.each([
    { kind: 'success' as const, message: 'Operation succeeded' },
    { kind: 'error' as const, message: 'Operation failed' },
    { kind: 'info' as const, message: 'System note' },
  ])('should render appropriate variant style for $kind toast', ({ kind, message }) => {
    let api!: ToastApi;

    render(
      <ToastProvider>
        <ToastTrigger
          onReady={(toast) => {
            api = toast;
          }}
        />
      </ToastProvider>,
    );

    act(() => {
      api[kind](message);
    });

    const messageElement = screen.getByText(message);

    expect(messageElement).toBeInTheDocument();

    const toastContainer = messageElement.closest(`.${styles.toast}`);

    expect(toastContainer).toBeInTheDocument();
    expect(toastContainer).toHaveClass(styles[kind]);
  });

  it('should auto-dismiss after timeout', () => {
    let api!: ToastApi;

    render(
      <ToastProvider>
        <ToastTrigger
          onReady={(toast) => {
            api = toast;
          }}
        />
      </ToastProvider>,
    );

    act(() => {
      api.success('Temporary notification');
    });

    expect(screen.getByText('Temporary notification')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3400);
    });
    expect(screen.getByText('Temporary notification')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.queryByText('Temporary notification')).not.toBeInTheDocument();
  });

  it('should contain an accessible aria-live region for announcements', () => {
    const { container } = render(
      <ToastProvider>
        <div>Child content</div>
      </ToastProvider>,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');

    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveClass(styles.viewport);
  });

  it('should prevent duplicate toasts within debounce threshold', () => {
    let api!: ToastApi;

    render(
      <ToastProvider>
        <ToastTrigger
          onReady={(toast) => {
            api = toast;
          }}
        />
      </ToastProvider>,
    );

    act(() => {
      api.info('Duplicate message');
      api.info('Duplicate message');
    });

    const matches = screen.getAllByText('Duplicate message');

    expect(matches).toHaveLength(1);
  });

  it('should allow duplicate toast after debounce window has passed', () => {
    let api!: ToastApi;

    render(
      <ToastProvider>
        <ToastTrigger
          onReady={(toast) => {
            api = toast;
          }}
        />
      </ToastProvider>,
    );

    act(() => {
      api.info('Debounced message');
    });
    expect(screen.getAllByText('Debounced message')).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1050);
    });

    act(() => {
      api.info('Debounced message');
    });
    expect(screen.getAllByText('Debounced message')).toHaveLength(2);
  });

  it('should throw error when useToast is used outside ToastProvider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(() => renderHook(() => useToast())).toThrow(
        'useToast must be used within ToastProvider',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
