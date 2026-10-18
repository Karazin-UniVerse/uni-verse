import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { BackButton } from './BackButton';

describe('BackButton Component', () => {
  it('should render a button with the label and an arrow icon', () => {
    const html = renderToString(<BackButton label="Back to courses" onClick={() => {}} />);

    expect(html).toMatch(/<button[^>]*type="button"/);
    expect(html).toContain('<svg');
    expect(html).toContain('Back to courses');
  });

  it('should keep the arrow icon before the label', () => {
    const html = renderToString(<BackButton label="Back" onClick={() => {}} />);

    expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('Back'));
  });
});
