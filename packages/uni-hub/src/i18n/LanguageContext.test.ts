import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { TRANSLATIONS } from './translations';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';

describe('LanguageContext and translations', () => {
  it('has consistent translation keys for uk and en', () => {
    const ukKeys = Object.keys(TRANSLATIONS.uk).sort();
    const enKeys = Object.keys(TRANSLATIONS.en).sort();

    expect(ukKeys).toEqual(enKeys);
  });

  it('renders default Ukrainian language in SSR', () => {
    const Consumer = () => {
      const { language, t } = useLanguage();

      return React.createElement(
        'div',
        null,
        React.createElement('span', { id: 'lang' }, language),
        React.createElement('span', { id: 'text' }, t('lang.uk')),
      );
    };

    const tree = React.createElement(LanguageProvider, null, React.createElement(Consumer));
    const html = renderToString(tree);

    expect(html).toContain('uk');
    expect(html).toContain('Українська');
  });

  it('renders LanguageSwitcher trigger button in SSR', () => {
    const tree = React.createElement(
      LanguageProvider,
      null,
      React.createElement(LanguageSwitcher, { showLabel: true }),
    );
    const html = renderToString(tree);

    expect(html).toContain('Українська');
    expect(html).toContain('button');
  });
});
