import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Popover } from './Popover';

describe('UNA Popover Component', () => {
  it('does not render when open is false', () => {
    const html = renderToString(
      <Popover open={false} onClose={vi.fn()}>
        <div>Popover Content</div>
      </Popover>,
    );

    expect(html).toBe('');
  });

  it('renders standard popover container when open is true', () => {
    const html = renderToString(
      <Popover open onClose={vi.fn()} title="Test Popover">
        <div>Popover Content</div>
      </Popover>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="false"');
    expect(html).toContain('Test Popover');
    expect(html).toContain('Popover Content');
  });

  it('renders close button when closeButton is true', () => {
    const html = renderToString(
      <Popover open onClose={vi.fn()} closeButton closeLabel="Dismiss">
        <div>Content</div>
      </Popover>,
    );

    expect(html).toContain('aria-label="Dismiss"');
    expect(html).toContain('<button');
  });

  it('renders footer content when footer prop is passed', () => {
    const html = renderToString(
      <Popover open onClose={vi.fn()} footer={<button type="button">Save</button>}>
        <div>Content</div>
      </Popover>,
    );

    expect(html).toContain('<button type="button">Save</button>');
  });

  it('applies custom className and width style variable', () => {
    const html = renderToString(
      <Popover open onClose={vi.fn()} className="custom-popover-class" width={380}>
        <div>Content</div>
      </Popover>,
    );

    expect(html).toContain('custom-popover-class');
    expect(html).toContain('--popover-width:380px');
  });
});
