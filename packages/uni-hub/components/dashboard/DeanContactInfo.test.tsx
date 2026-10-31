import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { DeanContactInfo } from './DeanContactInfo';

describe('DeanContactInfo component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
  });

  afterEach(() => {
    localStorage.removeItem('universe-lang');
  });

  it('should render dean contact info with contact channels (phone, email, hours, telegram)', () => {
    render(
      withLanguage(<DeanContactInfo />),
    );

    expect(screen.getByText('dean.cs@karazin.ua')).toBeInTheDocument();
    expect(screen.getByText('+38 (057) 707-55-55')).toBeInTheDocument();
    expect(screen.getByText('Пн–Пт, 09:00 – 17:00')).toBeInTheDocument();
    expect(screen.getByText('@karazin_edean')).toBeInTheDocument();

    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.getByText('Тел:')).toBeInTheDocument();
    expect(screen.getByText('Графік:')).toBeInTheDocument();
    expect(screen.getByText('Telegram:')).toBeInTheDocument();
  });

  it('should render localized labels appropriately when language is English', () => {
    localStorage.setItem('universe-lang', 'en');

    render(
      withLanguage(<DeanContactInfo />),
    );

    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.getByText('Phone:')).toBeInTheDocument();
    expect(screen.getByText('Hours:')).toBeInTheDocument();
    expect(screen.getByText('Mon–Fri, 09:00 – 17:00')).toBeInTheDocument();
    expect(screen.getByText('Telegram:')).toBeInTheDocument();
  });
});
