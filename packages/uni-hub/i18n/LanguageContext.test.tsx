import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider, useLanguage, getLocaleTag, LOCALE_TAGS } from './LanguageContext';
import { TRANSLATIONS, uk, en } from './translations';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import { ThemeProvider } from '../theme/ThemeContext';

describe('LanguageContext and translations', () => {
  it('should have consistent translation keys for uk and en', () => {
    const ukKeys = Object.keys(uk).sort();
    const enKeys = Object.keys(en).sort();

    expect(ukKeys).toEqual(enKeys);
    expect(Object.keys(TRANSLATIONS.uk).sort()).toEqual(ukKeys);
    expect(Object.keys(TRANSLATIONS.en).sort()).toEqual(enKeys);
  });

  it('should render default Ukrainian language', () => {
    const Consumer = () => {
      const { language, formatMessage } = useLanguage();

      return (
        <div>
          <span data-testid="lang">{language}</span>
          <span data-testid="text">{formatMessage('lang.uk')}</span>
        </div>
      );
    };

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('lang')).toHaveTextContent('uk');
    expect(screen.getByTestId('text')).toHaveTextContent('Українська');
  });

  it('should render LanguageSwitcher trigger button', () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher showLabel={true} />
      </LanguageProvider>,
    );

    expect(screen.getByRole('button', { name: /українська/i })).toBeInTheDocument();
  });

  it('should render translated theme name in ThemeSwitcher', () => {
    render(
      <LanguageProvider>
        <ThemeProvider>
          <ThemeSwitcher compact={true} showLabel={true} />
        </ThemeProvider>
      </LanguageProvider>,
    );

    expect(screen.getByText('Світла')).toBeInTheDocument();
  });

  it('should fallback to key when translation is missing', () => {
    const Consumer = () => {
      const { formatMessage } = useLanguage();

      return <span data-testid="missing">{formatMessage('missing.key' as any)}</span>;
    };

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('missing')).toHaveTextContent('missing.key');
  });

  it('should interpolate placeholders with provided values', () => {
    const Consumer = () => {
      const { formatMessage } = useLanguage();

      return (
        <div>
          <span data-testid="count">
            {formatMessage('quickActions.pendingCount', { count: 5 })}
          </span>
          <span data-testid="assignment">
            {formatMessage('recentGrades.viewAssignment', { name: 'Lab 1' })}
          </span>
        </div>
      );
    };

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('count')).toHaveTextContent('5 до виконання');
    expect(screen.getByTestId('assignment')).toHaveTextContent('Перейти до завдання: Lab 1');
  });

  it('should map language codes to BCP 47 locale tags', () => {
    expect(getLocaleTag('uk')).toBe('uk-UA');
    expect(getLocaleTag('en')).toBe('en-US');
    expect(LOCALE_TAGS.uk).toBe('uk-UA');
    expect(LOCALE_TAGS.en).toBe('en-US');
    expect(getLocaleTag('unknown' as any)).toBe('uk-UA');
  });

  it('should expose localeTag in LanguageContext', () => {
    const Consumer = () => {
      const { localeTag } = useLanguage();

      return <span data-testid="locale">{localeTag}</span>;
    };

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('uk-UA');
  });
});
