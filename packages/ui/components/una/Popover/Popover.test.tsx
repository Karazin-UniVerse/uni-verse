import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Popover } from './Popover';

describe('UNA Popover Component', () => {
  it('returns null when open is false', () => {
    const html = renderToString(
      <Popover open={false} onClose={() => {}}>
        <div>Content</div>
      </Popover>,
    );

    expect(html).toBe('');
  });

  it('renders dialog with content and title when open is true', () => {
    const html = renderToString(
      <Popover open={true} onClose={() => {}} title="Test Title">
        <div>Popover Body Content</div>
      </Popover>,
    );

    expect(html).toContain('<dialog');
    expect(html).toContain('open=""');
    expect(html).toContain('Test Title');
    expect(html).toContain('Popover Body Content');
  });

  it('omits close button when closeButton is false', () => {
    const html = renderToString(
      <Popover open={true} onClose={() => {}} title="Test Title" closeButton={false}>
        <div>Body</div>
      </Popover>,
    );

    expect(html).not.toContain('aria-label="Close"');
  });

  it('applies custom placement and width style', () => {
    const html = renderToString(
      <Popover open={true} onClose={() => {}} placement="top-start" width={400}>
        <div>Body</div>
      </Popover>,
    );

    expect(html).toContain('top-start');
    expect(html).toContain('--popover-width:400px');
  });
});
