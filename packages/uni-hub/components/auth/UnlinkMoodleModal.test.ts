import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { UnlinkMoodleModal } from './UnlinkMoodleModal';

vi.mock('@una', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@una');

  return {
    ...actual,
    Modal: ({
      open,
      title,
      children,
    }: {
      open: boolean;
      title?: string;
      children?: React.ReactNode;
    }) =>
      open
        ? React.createElement(
            'div',
            { role: 'dialog', 'aria-label': title },
            title ? React.createElement('h2', null, title) : null,
            children,
          )
        : null,
    useToast: () => ({
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    }),
  };
});

describe('UnlinkMoodleModal component', () => {
  it('renders confirmation prompt and actions when open', () => {
    const html = renderToString(
      React.createElement(UnlinkMoodleModal, {
        open: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );

    expect(html).toContain('Від&#x27;єднання акаунта Moodle');
    expect(html).toContain('Від&#x27;єднати');
    expect(html).toContain('Скасувати');
  });

  it('renders nothing visible when closed', () => {
    const html = renderToString(
      React.createElement(UnlinkMoodleModal, {
        open: false,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );

    expect(html).not.toContain("Ви дійсно бажаєте від'єднати");
  });
});
