import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { FeatureDisabledNotice } from './FeatureDisabledNotice';

describe('FeatureDisabledNotice', () => {
  it('renders default message from translations', () => {
    const html = renderToStaticMarkup(
      React.createElement(LanguageProvider, null, React.createElement(FeatureDisabledNotice)),
    );

    expect(html).toContain('Модуль тимчасово недоступний');
    expect(html).toContain('Цю функцію вимкнено в налаштуваннях');
  });

  it('renders custom title, description, and feature tag', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(FeatureDisabledNotice, {
          title: 'Custom Inactive Module',
          description: 'This test feature is offline',
          featureName: 'isOpportunitiesPlatformEnabled',
          onBackToOverview: () => {},
        }),
      ),
    );

    expect(html).toContain('Custom Inactive Module');
    expect(html).toContain('This test feature is offline');
    expect(html).toContain('flag: isOpportunitiesPlatformEnabled');
    expect(html).toContain('Повернутися до огляду');
  });
});
