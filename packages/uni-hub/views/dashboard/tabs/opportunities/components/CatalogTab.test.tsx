import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import { CatalogTab, type CatalogTabProps } from './CatalogTab';

const mockOpportunities: Opportunity[] = [
  {
    id: 'opp-1',
    title: 'Frontend Developer',
    description: 'React, TypeScript project for students',
    ownerContactInfo: 'hr@frontend.ua',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '400$ / month',
    ownerId: 'user-1',
    owner: {
      id: 'user-1',
      name: 'Alice Johnson',
      email: 'alice@frontend.ua',
    },
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'opp-2',
    title: 'Backend Engineer',
    description: 'Node.js and PostgreSQL backend services',
    ownerContactInfo: 'lead@backend.ua',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'UNPAID',
    paymentDetails: null,
    ownerId: 'user-2',
    owner: {
      id: 'user-2',
      name: 'Bob Smith',
      email: 'bob@backend.ua',
    },
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
  },
  {
    id: 'opp-3',
    title: 'UI/UX Designer',
    description: 'Figma and Design Systems workshop',
    ownerContactInfo: 'design-lead@kpi.ua',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '600$ / month',
    ownerId: 'user-3',
    owner: {
      id: 'user-3',
      name: 'Charlie Brown',
      email: 'charlie@kpi.ua',
    },
    createdAt: '2026-10-03T10:00:00.000Z',
    updatedAt: '2026-10-03T10:00:00.000Z',
  },
];

const renderCatalogTab = (props?: Partial<CatalogTabProps>) => {
  const defaultProps: CatalogTabProps = {
    loading: false,
    isError: false,
    onRetry: vi.fn(),
    opportunities: mockOpportunities,
    search: '',
    onSearchChange: vi.fn(),
    paymentFilter: '',
    onPaymentFilterChange: vi.fn(),
    onOpenDetail: vi.fn(),
    ...props,
  };

  return {
    ...render(
      <LanguageProvider>
        <CatalogTab {...defaultProps} />
      </LanguageProvider>,
    ),
    props: defaultProps,
  };
};

describe('CatalogTab component', () => {
  it('should render search input and payment filter select', () => {
    renderCatalogTab();

    const searchInput = screen.getByRole('textbox', { name: /пошук можливостей/i });

    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Усі' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Оплачувані' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Волонтерство / Практика' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /очистити поле пошуку/i })).not.toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('UI/UX Designer')).toBeInTheDocument();
  });

  it('should call onSearchChange when typing in search input', () => {
    const onSearchChange = vi.fn();

    renderCatalogTab({ onSearchChange });

    const searchInput = screen.getByRole('textbox', { name: /пошук можливостей/i });

    fireEvent.change(searchInput, { target: { value: 'Frontend' } });

    expect(onSearchChange).toHaveBeenCalledWith('Frontend');
  });

  it('should clear search input when clicking clear button', () => {
    const onSearchChange = vi.fn();

    renderCatalogTab({ search: 'Frontend', onSearchChange });

    const clearButton = screen.getByRole('button', { name: /очистити поле пошуку/i });

    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);

    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('should call onPaymentFilterChange when changing payment filter select', () => {
    const onPaymentFilterChange = vi.fn();

    renderCatalogTab({ onPaymentFilterChange });

    const paidChip = screen.getByRole('button', { name: 'Оплачувані' });
    const unpaidChip = screen.getByRole('button', { name: 'Волонтерство / Практика' });
    const allChip = screen.getByRole('button', { name: 'Усі' });

    fireEvent.click(paidChip);
    expect(onPaymentFilterChange).toHaveBeenCalledWith('PAID');

    fireEvent.click(unpaidChip);
    expect(onPaymentFilterChange).toHaveBeenCalledWith('UNPAID');

    fireEvent.click(allChip);
    expect(onPaymentFilterChange).toHaveBeenCalledWith('');
  });

  it('should filter opportunities in memory by search term', () => {
    const { rerender } = render(
      <LanguageProvider>
        <CatalogTab
          loading={false}
          isError={false}
          onRetry={vi.fn()}
          opportunities={mockOpportunities}
          search="Frontend"
          onSearchChange={vi.fn()}
          paymentFilter=""
          onPaymentFilterChange={vi.fn()}
          onOpenDetail={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('UI/UX Designer')).not.toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <CatalogTab
          loading={false}
          isError={false}
          onRetry={vi.fn()}
          opportunities={mockOpportunities}
          search="PostgreSQL"
          onSearchChange={vi.fn()}
          paymentFilter=""
          onPaymentFilterChange={vi.fn()}
          onOpenDetail={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <CatalogTab
          loading={false}
          isError={false}
          onRetry={vi.fn()}
          opportunities={mockOpportunities}
          search="Charlie"
          onSearchChange={vi.fn()}
          paymentFilter=""
          onPaymentFilterChange={vi.fn()}
          onOpenDetail={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('UI/UX Designer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
  });

  it('should filter opportunities in memory by payment filter', () => {
    const { rerender } = render(
      <LanguageProvider>
        <CatalogTab
          loading={false}
          isError={false}
          onRetry={vi.fn()}
          opportunities={mockOpportunities}
          search=""
          onSearchChange={vi.fn()}
          paymentFilter="PAID"
          onPaymentFilterChange={vi.fn()}
          onOpenDetail={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('UI/UX Designer')).toBeInTheDocument();
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <CatalogTab
          loading={false}
          isError={false}
          onRetry={vi.fn()}
          opportunities={mockOpportunities}
          search=""
          onSearchChange={vi.fn()}
          paymentFilter="UNPAID"
          onPaymentFilterChange={vi.fn()}
          onOpenDetail={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
    expect(screen.queryByText('UI/UX Designer')).not.toBeInTheDocument();
  });

  it('should trigger onOpenDetail when clicking an opportunity card', () => {
    const onOpenDetail = vi.fn();

    renderCatalogTab({ onOpenDetail });

    const detailButton = screen.getByRole('button', {
      name: 'Детальніше про Frontend Developer',
    });

    fireEvent.click(detailButton);

    expect(onOpenDetail).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).toHaveBeenCalledWith(mockOpportunities[0]);
  });

  it('should render empty state when filtered opportunities list is empty', () => {
    renderCatalogTab({ search: 'NonExistentTitleOrKeyword' });

    expect(
      screen.getByText('За вашим запитом не знайдено доступних можливостей'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
  });

  it('should render loading spinner when loading is true', () => {
    renderCatalogTab({ loading: true });

    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
    expect(screen.queryByText(/знайдено:/i)).not.toBeInTheDocument();
  });
});
