import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withLanguage } from '@uni-hub/utils/test-utils';
import type { OpportunityStatus } from '@core/constants/opportunities';
import { OpportunityStatusBadge } from './OpportunityStatusBadge';

describe('OpportunityStatusBadge', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
  });

  it.each<{ status: OpportunityStatus; expectedText: string }>([
    { status: 'DRAFT', expectedText: 'Чернетка' },
    { status: 'READY_FOR_REVIEW', expectedText: 'На модерації' },
    { status: 'REQUIRES_CHANGES', expectedText: 'Потребує правок' },
    { status: 'PUBLISHED', expectedText: 'Опубліковано' },
    { status: 'REJECTED', expectedText: 'Відхилено' },
  ])('should render $status status with localized text', ({ status, expectedText }) => {
    render(withLanguage(<OpportunityStatusBadge status={status} />));

    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  it('should render fallback Tag for unknown status', () => {
    const unknownStatus = 'ARCHIVED' as OpportunityStatus;

    render(withLanguage(<OpportunityStatusBadge status={unknownStatus} />));

    expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
  });

  it('should render localized text in English when language is en', () => {
    localStorage.setItem('universe-lang', 'en');

    render(withLanguage(<OpportunityStatusBadge status="PUBLISHED" />));

    expect(screen.getByText('Published')).toBeInTheDocument();
  });
});
