import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { OpportunitiesTab } from './OpportunitiesTab';
import { MOCK_OPPORTUNITIES } from './opportunities.mock';

describe('OpportunitiesTab', () => {
  it('contains valid mock opportunities data', () => {
    expect(MOCK_OPPORTUNITIES.length).toBeGreaterThan(0);

    for (const item of MOCK_OPPORTUNITIES) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.organization).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.deadline).toBeTruthy();
      expect(item.externalUrl).toMatch(/^https?:\/\//);
    }
  });

  it('renders correctly under LanguageProvider', () => {
    const html = renderToStaticMarkup(
      React.createElement(LanguageProvider, null, React.createElement(OpportunitiesTab)),
    );

    expect(html).toContain('Платформа можливостей');
    expect(html).toContain('EPAM Systems');
    expect(html).toContain('Erasmus+');
  });
});
