import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl Component', () => {
  const sampleItems = [
    { id: 'first', label: 'First' },
    { id: 'second', label: 'Second', badge: 4 },
    { id: 'third', label: 'Third', badge: 0 },
  ];

  it('should render a tablist with an accessible label', () => {
    const html = renderToString(
      <SegmentedControl
        items={sampleItems}
        selectedId="first"
        panelIdPrefix="panel"
        ariaLabel="Sections"
        onSelect={() => {}}
      />,
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Sections"');
  });

  it('should mark only the selected tab and give it the roving tabindex', () => {
    const html = renderToString(
      <SegmentedControl
        items={sampleItems}
        selectedId="second"
        panelIdPrefix="panel"
        onSelect={() => {}}
      />,
    );

    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*tabindex="0"[^>]*>Second/);
    expect(html).toMatch(/role="tab"[^>]*aria-selected="false"[^>]*tabindex="-1"[^>]*>First/);
  });

  it('should link each tab to its panel through the prefix', () => {
    const html = renderToString(
      <SegmentedControl
        items={sampleItems}
        selectedId="first"
        panelIdPrefix="study-panel"
        onSelect={() => {}}
      />,
    );

    expect(html).toContain('aria-controls="study-panel-first"');
    expect(html).toContain('aria-controls="study-panel-third"');
  });

  it('should render a badge only when it is greater than zero', () => {
    const html = renderToString(
      <SegmentedControl
        items={sampleItems}
        selectedId="first"
        panelIdPrefix="panel"
        onSelect={() => {}}
      />,
    );

    expect(html).toContain('>4</span>');
    expect(html).not.toContain('>0</span>');
  });
});
