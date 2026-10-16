import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Opportunity } from '@uni-hub/types';
import { OpportunityCard } from './OpportunityCard';

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
});
