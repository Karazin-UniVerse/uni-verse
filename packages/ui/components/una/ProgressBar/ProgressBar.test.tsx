import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ProgressBar } from './ProgressBar';

describe('UNA ProgressBar Component', () => {
  it('should render progressbar element with role="progressbar" and accessibility labels', () => {
    const html = renderToString(<ProgressBar value={75} max={100} />);

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="75"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('aria-valuetext="75%"');
  });

  it('should clamp values safely to [0, max]', () => {
    const overHtml = renderToString(<ProgressBar value={150} max={100} />);
    const underHtml = renderToString(<ProgressBar value={-20} max={100} />);

    expect(overHtml).toContain('aria-valuenow="100"');
    expect(underHtml).toContain('aria-valuenow="0"');
  });

  it('should support custom ariaLabel and custom className', () => {
    const html = renderToString(
      <ProgressBar value={50} ariaLabel="Успішність студента" className="academic-progress" />,
    );

    expect(html).toContain('aria-label="Успішність студента"');
    expect(html).toContain('academic-progress');
  });

  it('should render tone class on fill element', () => {
    const html = renderToString(<ProgressBar value={60} tone="success" />);

    expect(html).toContain('success');
  });
});
