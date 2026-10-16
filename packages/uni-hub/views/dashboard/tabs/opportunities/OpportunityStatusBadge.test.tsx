import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { OpportunityStatus } from '@uni-hub/types';
import { OpportunityStatusBadge } from './OpportunityStatusBadge';

vi.mock('@una', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@una');

  return {
    ...actual,
    Tag: ({ children, tone }: { children: React.ReactNode; tone?: string }) => (
      <span data-testid="status-badge" data-tone={tone}>
        {children}
      </span>
    ),
  };
});

describe('OpportunityStatusBadge', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should render DRAFT status with neutral tone and localized text', () => {
    render(
      <LanguageProvider>
        <OpportunityStatusBadge status="DRAFT" />
      </LanguageProvider>,
    );

    const badge = screen.getByTestId('status-badge');

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-tone', 'neutral');
    expect(badge).toHaveTextContent('Чернетка');
  });

  it('should render READY_FOR_REVIEW status with info tone and localized text', () => {
    render(
      <LanguageProvider>
        <OpportunityStatusBadge status="READY_FOR_REVIEW" />
      </LanguageProvider>,
    );

    const badge = screen.getByTestId('status-badge');

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-tone', 'info');
    expect(badge).toHaveTextContent('На модерації');
  });

  it('should render REQUIRES_CHANGES status with warning tone and localized text', () => {
    render(
      <LanguageProvider>
        <OpportunityStatusBadge status="REQUIRES_CHANGES" />
      </LanguageProvider>,
    );

    const badge = screen.getByTestId('status-badge');

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-tone', 'warning');
    expect(badge).toHaveTextContent('Потребує правок');
  });

  it('should render PUBLISHED status with success tone and localized text', () => {
    render(
      <LanguageProvider>
        <OpportunityStatusBadge status="PUBLISHED" />
      </LanguageProvider>,
    );

    const badge = screen.getByTestId('status-badge');

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-tone', 'success');
    expect(badge).toHaveTextContent('Опубліковано');
  });

  it('should render REJECTED status with danger tone and localized text', () => {
    render(
      <LanguageProvider>
        <OpportunityStatusBadge status="REJECTED" />
      </LanguageProvider>,
    );

    const badge = screen.getByTestId('status-badge');

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-tone', 'danger');
    expect(badge).toHaveTextContent('Відхилено');
  });

  it('should render fallback neutral Tag for unknown status', () => {
    const unknownStatus = 'ARCHIVED' as OpportunityStatus;

    render(
      <LanguageProvider>
        <OpportunityStatusBadge status={unknownStatus} />
      </LanguageProvider>,
    );

    const badge = screen.getByTestId('status-badge');

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-tone', 'neutral');
    expect(badge).toHaveTextContent('ARCHIVED');
  });

  it('should render localized text in English when language is en', () => {
    localStorage.setItem('universe-lang', 'en');

    render(
      <LanguageProvider>
        <OpportunityStatusBadge status="PUBLISHED" />
      </LanguageProvider>,
    );

    const badge = screen.getByTestId('status-badge');

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-tone', 'success');
    expect(badge).toHaveTextContent('Published');
  });
});
