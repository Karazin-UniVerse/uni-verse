import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TopicChips } from './TopicChips';

describe('TopicChips Component', () => {
  const sampleOptions = [
    { id: 'opt1', label: 'Option 1' },
    { id: 'opt2', label: 'Option 2' },
    { id: 'opt3', label: 'Option 3' },
  ];

  it('should render radiogroup container with role="radiogroup" and accessible label', () => {
    const html = renderToString(
      <TopicChips
        label="Select Option"
        options={sampleOptions}
        selectedId="opt1"
        onSelect={() => {}}
      />,
    );

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Select Option"');
    expect(html).toContain('Select Option');
  });

  it('should render fallback ariaLabel when label is omitted', () => {
    const html = renderToString(
      <TopicChips
        ariaLabel="Inquiry topics"
        options={sampleOptions}
        selectedId="opt1"
        onSelect={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Inquiry topics"');
  });

  it('should set aria-checked and roving tabindex correctly when an item is selected', () => {
    const html = renderToString(
      <TopicChips options={sampleOptions} selectedId="opt2" onSelect={() => {}} />,
    );

    expect(html).toContain('role="radio"');
    // opt2 should be checked with tabIndex=0
    expect(html).toMatch(/role="radio"[^>]*aria-checked="true"[^>]*tabindex="0"[^>]*>Option 2/);
    // opt1 should be unchecked with tabIndex=-1
    expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*tabindex="-1"[^>]*>Option 1/);
    // opt3 should be unchecked with tabIndex=-1
    expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*tabindex="-1"[^>]*>Option 3/);
  });

  it('should give the first option tabIndex="0" when no item is selected', () => {
    const html = renderToString(
      <TopicChips options={sampleOptions} selectedId="" onSelect={() => {}} />,
    );

    // opt1 should have tabIndex=0
    expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*tabindex="0"[^>]*>Option 1/);
    // opt2 and opt3 should have tabIndex=-1
    expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*tabindex="-1"[^>]*>Option 2/);
    expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*tabindex="-1"[^>]*>Option 3/);
  });
});
