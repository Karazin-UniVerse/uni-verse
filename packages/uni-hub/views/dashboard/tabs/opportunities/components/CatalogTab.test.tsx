import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import type { Opportunity } from '@core/types/opportunities';
import type { OpportunityFilters } from '@uni-hub/store/useOpportunitiesStore';
import { CatalogTab, type CatalogTabProps } from './CatalogTab';

const mockOpportunities: Opportunity[] = [
  {
    id: 'opp-1',
    title: 'Frontend Developer',
    description: 'React, TypeScript project for students',
    ownerContactInfo: 'hr@frontend.ua',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    acceptsApplications: true,
    paymentType: 'PAID',
    paymentDetails: '400$ / month',
    tags: [{ id: '1', name: 'react' }],
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
    acceptsApplications: false,
    paymentType: 'UNPAID',
    paymentDetails: null,
    tags: [{ id: '2', name: 'nodejs' }],
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
    acceptsApplications: true,
    paymentType: 'PAID',
    paymentDetails: '600$ / month',
    tags: [{ id: '3', name: 'design' }],
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
    isRecruiting: false,
    tags: [],
    onOpenDetail: vi.fn(),
    ...props,
  };

  return {
    ...render(withLanguage(<CatalogTab {...defaultProps} />)),
    props: defaultProps,
  };
};

describe('CatalogTab component', () => {
  it('should render search input and filters trigger button', () => {
    renderCatalogTab();

    const searchInput = screen.getByRole('textbox', { name: /пошук можливостей/i });
    const filtersButton = screen.getByRole('button', { name: /фільтри/i });

    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('');
    expect(filtersButton).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('UI/UX Designer')).toBeInTheDocument();
  });

  it('should call onSearchChange when typing in search input', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    renderCatalogTab({ onSearchChange });

    const searchInput = screen.getByRole('textbox', { name: /пошук можливостей/i });

    await user.type(searchInput, 'Frontend');

    expect(onSearchChange).toHaveBeenCalled();
  });

  it('should clear search input when clicking clear button', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    renderCatalogTab({ search: 'Frontend', onSearchChange });

    const clearButton = screen.getByRole('button', { name: /очистити поле/i });

    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);

    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('should open filter panel and apply new filters', async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();

    renderCatalogTab({ onFiltersChange });

    const filtersButton = screen.getByRole('button', { name: /фільтри/i });

    await user.click(filtersButton);

    expect(screen.getByRole('dialog', { name: /фільтри/i })).toBeInTheDocument();

    const recruitingCheckbox = screen.getByRole('checkbox', { name: /зараз іде набір/i });

    await user.click(recruitingCheckbox);

    const applyButton = screen.getByRole('button', { name: /застосувати/i });

    await user.click(applyButton);

    expect(onFiltersChange).toHaveBeenCalledWith({
      paymentType: '',
      isRecruiting: true,
      tags: [],
    });
  });

  it('should filter by a short pending tag on Apply without requiring Enter', async () => {
    const user = userEvent.setup();
    const opportunities: Opportunity[] = [
      { ...mockOpportunities[0], tags: [{ id: 'tag-3d', name: '3d' }] },
      mockOpportunities[1],
    ];
    const Wrapper = (): React.ReactElement => {
      const [filters, setFilters] = useState<OpportunityFilters>({
        paymentType: '',
        isRecruiting: false,
        tags: [],
      });

      return (
        <CatalogTab
          loading={false}
          isError={false}
          onRetry={vi.fn()}
          opportunities={opportunities}
          search=""
          onSearchChange={vi.fn()}
          onOpenDetail={vi.fn()}
          tags={filters.tags}
          onFiltersChange={setFilters}
        />
      );
    };

    render(withLanguage(<Wrapper />));

    await user.click(screen.getByRole('button', { name: /фільтри/i }));
    await user.type(screen.getByRole('combobox', { name: 'Теги' }), '3D');
    await user.click(screen.getByRole('button', { name: 'Застосувати' }));

    expect(screen.getByRole('heading', { name: 'Frontend Developer' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Backend Engineer' })).not.toBeInTheDocument();
    expect(screen.getByText('3d')).toBeInTheDocument();
  });

  it('should filter opportunities in memory by search term and tags', () => {
    const { rerender } = render(
      withLanguage(
        <CatalogTab
          loading={false}
          isError={false}
          onRetry={vi.fn()}
          opportunities={mockOpportunities}
          search="Frontend"
          onSearchChange={vi.fn()}
          onOpenDetail={vi.fn()}
        />,
      ),
    );

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('UI/UX Designer')).not.toBeInTheDocument();

    rerender(
      withLanguage(
        <CatalogTab
          loading={false}
          isError={false}
          onRetry={vi.fn()}
          opportunities={mockOpportunities}
          search=""
          tags={['nodejs']}
          onSearchChange={vi.fn()}
          onOpenDetail={vi.fn()}
        />,
      ),
    );

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
  });

  it('should filter opportunities in memory by recruiting status', () => {
    render(
      withLanguage(
        <CatalogTab
          loading={false}
          isError={false}
          onRetry={vi.fn()}
          opportunities={mockOpportunities}
          search=""
          isRecruiting={true}
          onSearchChange={vi.fn()}
          onOpenDetail={vi.fn()}
        />,
      ),
    );

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('UI/UX Designer')).toBeInTheDocument();
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();
  });

  it('should trigger onOpenDetail when clicking an opportunity card', async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();

    renderCatalogTab({ onOpenDetail });

    const detailButton = screen.getByRole('button', {
      name: /детальніше про Frontend Developer/i,
    });

    await user.click(detailButton);

    expect(onOpenDetail).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).toHaveBeenCalledWith(mockOpportunities[0]);
  });
});
