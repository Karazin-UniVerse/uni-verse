import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import type { Opportunity } from '@core/types/opportunities';
import { OpportunityCard } from './OpportunityCard';
import { buildOpportunity } from './opportunities/test-utils';

describe('OpportunityCard component', () => {
  const mockOpportunity: Opportunity = {
    id: 'opp-1',
    title: 'Frontend Developer for Edu Startup',
    description: 'Looking for a passionate React developer',
    ownerContactInfo: 'hr@startup.ua',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '500$ / міс',
    ownerId: 'user-1',
    owner: {
      id: 'user-1',
      name: 'Startup Inc',
      email: 'team@startup.ua',
    },
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };

  it('should render catalog card with title, description, and compensation details', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    expect(screen.getByText('Frontend Developer for Edu Startup')).toBeInTheDocument();
    expect(screen.getByText('Looking for a passionate React developer')).toBeInTheDocument();
    expect(screen.getByText('500$ / міс')).toBeInTheDocument();
    expect(screen.getByText('Вакансія')).toBeInTheDocument();
    expect(screen.getByText('Startup Inc')).toBeInTheDocument();
    expect(screen.getByText('hr@startup.ua')).toBeInTheDocument();
  });

  it('should render practice badge for unpaid opportunities', () => {
    const unpaidOpp: Opportunity = {
      ...mockOpportunity,
      paymentType: 'UNPAID',
      paymentDetails: null,
    };

    render(<OpportunityCard opportunity={unpaidOpp} />);

    expect(screen.getByText('Практика')).toBeInTheDocument();
    expect(screen.getByText('Досвід / Практика')).toBeInTheDocument();
  });

  it('should render owner variant with management action buttons', () => {
    render(
      <OpportunityCard
        opportunity={mockOpportunity}
        variant="owner"
        statusBadge={<span>Опубліковано</span>}
      />,
    );

    expect(screen.getByText('Опубліковано')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /відгуки/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /управління/i })).toBeInTheDocument();
  });

  it('should call onOpenDetail when clicking owner card overlay link', async () => {
    const onOpenDetail = vi.fn();

    render(
      <OpportunityCard
        opportunity={mockOpportunity}
        variant="owner"
        statusBadge={<span>Опубліковано</span>}
        onOpenDetail={onOpenDetail}
      />,
    );

    const overlayLink = screen.getByRole('button', {
      name: `Детальніше про ${mockOpportunity.title}`,
    });

    await userEvent.click(overlayLink);

    expect(onOpenDetail).toHaveBeenCalledWith(mockOpportunity);
  });

  it('should call onOpenApplicants when clicking applications button without triggering onOpenDetail', async () => {
    const onOpenDetail = vi.fn();
    const onOpenApplicants = vi.fn();

    render(
      <OpportunityCard
        opportunity={mockOpportunity}
        variant="owner"
        statusBadge={<span>Опубліковано</span>}
        onOpenDetail={onOpenDetail}
        onOpenApplicants={onOpenApplicants}
      />,
    );

    const applicantsButton = screen.getByRole('button', { name: /відгуки/i });

    await userEvent.click(applicantsButton);

    expect(onOpenApplicants).toHaveBeenCalledWith(mockOpportunity);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it('should render applications closed badge when acceptsApplications is false', () => {
    const closedOpp: Opportunity = {
      ...mockOpportunity,
      acceptsApplications: false,
    };

    render(<OpportunityCard opportunity={closedOpp} />);

    expect(screen.getByText('Набір закрито')).toBeInTheDocument();
  });

  it('should render 2 direct tag children in badge row when accepting applications', () => {
    const { container } = render(<OpportunityCard opportunity={mockOpportunity} />);
    const badgeRow = container.querySelector('[class*="cardBadgeRow"]');

    expect(badgeRow?.children).toHaveLength(2);
  });

  it('should render 3 direct tag children in badge row when applications are closed', () => {
    const closedOpp: Opportunity = {
      ...mockOpportunity,
      acceptsApplications: false,
    };
    const { container } = render(<OpportunityCard opportunity={closedOpp} />);
    const badgeRow = container.querySelector('[class*="cardBadgeRow"]');

    expect(badgeRow?.children).toHaveLength(3);
  });
});

describe('OpportunityCard', () => {
  const opportunity = { ...buildOpportunity('saved'), status: 'PUBLISHED' as const };

  it('toggles the star independently from opening details', async () => {
    const toggle = vi.fn();
    const open = vi.fn();
    const user = userEvent.setup();

    render(
      <OpportunityCard
        opportunity={opportunity}
        isFavorite
        onToggleFavorite={toggle}
        onOpenDetail={open}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Видалити з обраного' }));
    expect(toggle).toHaveBeenCalledWith(opportunity.id, true);
    expect(open).not.toHaveBeenCalled();
  });

  it.each(['temporary', 'permanent'] as const)(
    'keeps %s cards removable without detail navigation',
    async (availability) => {
      const toggle = vi.fn();
      const user = userEvent.setup();

      render(
        <OpportunityCard
          opportunity={{ id: 'saved', title: 'Saved title', paymentType: 'UNPAID', availability }}
          isFavorite
          onToggleFavorite={toggle}
          onOpenDetail={vi.fn()}
        />,
      );
      expect(screen.getByRole('status')).toHaveTextContent(
        availability === 'temporary' ? 'Тимчасово недоступна' : 'Більше недоступна',
      );
      expect(screen.queryByRole('button', { name: /Переглянути деталі/ })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Видалити з обраного' }));
      expect(toggle).toHaveBeenCalledWith('saved', true);
    },
  );
});
