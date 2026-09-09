import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from '../../../packages/ui/components/una/ProgressBar';
import { Tag, type TagTone } from '../../../packages/ui/components/una/Tag';
import { Modal } from '../../../packages/ui/components/una/Modal';
import { readWorkspaceFile } from '../test-helpers';

describe('Tier 2 - Feature 4 & 5: Boundary & Corner Cases in UI Components & Tokens', () => {
  it('F4-B1: ProgressBar boundary clamp: 0% and 100% values', () => {
    const htmlZero = renderToStaticMarkup(React.createElement(ProgressBar, { value: 0 }));

    expect(htmlZero).toContain('aria-valuenow="0"');
    expect(htmlZero).toContain('aria-valuetext="0%"');

    const htmlHundred = renderToStaticMarkup(React.createElement(ProgressBar, { value: 100 }));

    expect(htmlHundred).toContain('aria-valuenow="100"');
    expect(htmlHundred).toContain('aria-valuetext="100%"');

    const htmlNegative = renderToStaticMarkup(React.createElement(ProgressBar, { value: -15 }));

    expect(htmlNegative).toContain('aria-valuenow="0"');
    expect(htmlNegative).toContain('aria-valuetext="0%"');

    const htmlOverflow = renderToStaticMarkup(React.createElement(ProgressBar, { value: 120 }));

    expect(htmlOverflow).toContain('aria-valuenow="100"');
    expect(htmlOverflow).toContain('aria-valuetext="100%"');
  });

  it('F4-B2: Tag component supports standard feedback tones', () => {
    const validTones: TagTone[] = ['default', 'neutral', 'success', 'warning', 'info', 'danger'];

    validTones.forEach((tone) => {
      const html = renderToStaticMarkup(React.createElement(Tag, { tone }, `Tone ${tone}`));

      expect(html).toContain(`Tone ${tone}`);
    });
  });

  it('F4-B3: Modal component should support controlled open/close boolean states', () => {
    const closedHtml = renderToStaticMarkup(
      React.createElement(Modal, { open: false, onClose: () => {} }, 'Hidden Modal Content'),
    );

    expect(closedHtml).toBe('');

    const openHtml = renderToStaticMarkup(
      React.createElement(Modal, { open: true, onClose: () => {} }, 'Visible Modal Content'),
    );

    expect(openHtml).toContain('Visible Modal Content');
  });

  it('F5-B1: Breakpoints SCSS should define media query bounds for standard mobile/desktop', () => {
    const bpContent = readWorkspaceFile('packages/ui/breakpoints.scss');

    expect(bpContent).toMatch(/768|1024|1280|mobile|tablet|desktop/);
  });

  it('F5-B2: SCSS tokens should declare CSS custom properties or Sass variables for dark mode / themes', () => {
    const varsContent = readWorkspaceFile('packages/ui/vars.scss');

    expect(varsContent.length).toBeGreaterThan(500);
    expect(varsContent).toMatch(/theme|dark|light|background|color/i);
  });
});
