import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { FeatureDisabledNotice } from './FeatureDisabledNotice';

describe('FeatureDisabledNotice', () => {
  it('renders default message from translations without feature tag by default', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(FeatureDisabledNotice, {
          featureName: 'isOpportunitiesPlatformEnabled',
          showFeatureTag: false,
        }),
      ),
    );

    expect(html).toContain('Модуль тимчасово недоступний');
    expect(html).toContain('Цю функцію вимкнено в налаштуваннях');
    expect(html).not.toContain('isOpportunitiesPlatformEnabled');
    expect(html).not.toContain('flag:');
  });

  it('renders custom title, description, and feature tag when showFeatureTag is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(FeatureDisabledNotice, {
          title: 'Custom Inactive Module',
          description: 'This test feature is offline',
          featureName: 'isOpportunitiesPlatformEnabled',
          showFeatureTag: true,
          onBackToOverview: () => {},
        }),
      ),
    );

    expect(html).toContain('Custom Inactive Module');
    expect(html).toContain('This test feature is offline');
    expect(html).toContain('isOpportunitiesPlatformEnabled');
    expect(html).not.toContain('flag:');
    expect(html).toContain('Повернутися до огляду');
  });
});
