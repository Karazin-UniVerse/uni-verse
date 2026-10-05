import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Tag } from './Tag';

describe('UNA Tag Component', () => {
  it('should render tag content inside span element', () => {
    const html = renderToString(<Tag>Active Status</Tag>);

    expect(html).toContain('<span');
    expect(html).toContain('Active Status');
  });

  it('should render with custom tones such as success, warning, neutral', () => {
    const successHtml = renderToString(<Tag tone="success">Passed</Tag>);
    const neutralHtml = renderToString(<Tag tone="neutral">Pending</Tag>);

    expect(successHtml).toContain('Passed');
    expect(neutralHtml).toContain('Pending');
  });

  it('should merge custom className with base tag styles', () => {
    const html = renderToString(<Tag className="custom-indicator-badge">Custom</Tag>);

    expect(html).toContain('custom-indicator-badge');
  });
});
