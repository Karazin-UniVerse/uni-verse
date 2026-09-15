import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Button } from './Button';

describe('UNA Button Component', () => {
  it('should render standard button element with default type="button"', () => {
    const html = renderToString(<Button>Click me</Button>);

    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('Click me');
  });

  it('should render an anchor element when isLink is true', () => {
    const html = renderToString(
      <Button isLink href="/dashboard">
        Dashboard Link
      </Button>,
    );

    expect(html).toContain('<a');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('Dashboard Link');
    expect(html).not.toContain('<button');
  });

  it('should apply custom className and variant styles', () => {
    const html = renderToString(
      <Button variant="secondary" size="large" className="custom-test-class">
        Action
      </Button>,
    );

    expect(html).toContain('custom-test-class');
    expect(html).toContain('Action');
  });

  it('should pass through native button attributes like disabled', () => {
    const html = renderToString(<Button disabled>Disabled Action</Button>);

    expect(html).toContain('disabled');
  });
});
