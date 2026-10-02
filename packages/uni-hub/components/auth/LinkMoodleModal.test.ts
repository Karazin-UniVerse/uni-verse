import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LinkMoodleModal } from './LinkMoodleModal';

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

describe('LinkMoodleModal component', () => {
  it('renders default connect mode correctly when open', () => {
    const html = renderToString(
      React.createElement(LinkMoodleModal, {
        open: true,
        mode: 'connect',
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );

    expect(html).toContain('Прив&#x27;язка акаунта Moodle');
    expect(html).toContain('Прив’язати Moodle');
    expect(html).toContain('modal-link-moodle-username');
    expect(html).toContain('modal-link-moodle-password');
  });

  it('renders change mode correctly when open with mode="change"', () => {
    const html = renderToString(
      React.createElement(LinkMoodleModal, {
        open: true,
        mode: 'change',
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );

    expect(html).toContain('Зміна акаунта Moodle');
    expect(html).toContain('Змінити акаунт');
    expect(html).toContain('Введіть нові облікові дані Moodle');
  });

  it('renders nothing visible when closed', () => {
    const html = renderToString(
      React.createElement(LinkMoodleModal, {
        open: false,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );

    expect(html).not.toContain('modal-link-moodle-username');
  });
});
