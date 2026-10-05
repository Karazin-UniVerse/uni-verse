import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Modal } from './Modal';

describe('UNA Modal Component', () => {
  it('does not render when open is false', () => {
    const html = renderToString(
      <Modal open={false} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>,
    );

    expect(html).toBe('');
  });

  it('renders standard modal structure when open is true', () => {
    const html = renderToString(
      <Modal open onClose={vi.fn()} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Test Modal');
    expect(html).toContain('Modal Content');
    expect(html).toContain('aria-label="Close"');
  });

  it('uses custom closeLabel and width', () => {
    const html = renderToString(
      <Modal open onClose={vi.fn()} closeLabel="Закрити вікно" width={500} className="custom-modal">
        <div>Content</div>
      </Modal>,
    );

    expect(html).toContain('aria-label="Закрити вікно"');
    expect(html).toContain('--modal-dialog-width:500px');
    expect(html).toContain('custom-modal');
  });
});
