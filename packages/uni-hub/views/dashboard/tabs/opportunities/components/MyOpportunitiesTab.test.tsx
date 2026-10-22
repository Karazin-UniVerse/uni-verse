import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import type { Opportunity } from '@core/types/opportunities';
import { MyOpportunitiesTab, type MyOpportunitiesTabProps } from './MyOpportunitiesTab';

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
    status: 'DRAFT',
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
];

const renderMyOpportunitiesTab = (props?: Partial<MyOpportunitiesTabProps>) => {
  const defaultProps: MyOpportunitiesTabProps = {
    loading: false,
    isError: false,
    onRetry: vi.fn(),
    myOpportunities: mockOpportunities,
    onOpenApplicants: vi.fn(),
    onOpenDetail: vi.fn(),
    ...props,
  };

  return {
    ...render(
      withLanguage(<MyOpportunitiesTab {...defaultProps} />),
    ),
    props: defaultProps,
  };
};

describe('MyOpportunitiesTab component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should render grid of owner opportunity cards with status badges', () => {
    renderMyOpportunitiesTab();

    expect(
      screen.getByRole('heading', { level: 3, name: 'Frontend Developer' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Backend Engineer' })).toBeInTheDocument();
    expect(screen.getByText('Опубліковано')).toBeInTheDocument();
    expect(screen.getByText('Чернетка')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Відгуки' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Управління' })).toHaveLength(2);
  });

  it('should trigger onOpenApplicants when clicking applicants button on an opportunity card', async () => {
    const user = userEvent.setup();
    const onOpenApplicants = vi.fn();

    renderMyOpportunitiesTab({ onOpenApplicants });

    const applicantsButtons = screen.getAllByRole('button', { name: 'Відгуки' });

    await user.click(applicantsButtons[0]);

    expect(onOpenApplicants).toHaveBeenCalledTimes(1);
    expect(onOpenApplicants).toHaveBeenCalledWith(mockOpportunities[0]);
  });

  it('should trigger onOpenDetail when clicking an opportunity card', async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();

    renderMyOpportunitiesTab({ onOpenDetail });

    const detailButtons = screen.getAllByRole('button', { name: 'Управління' });

    await user.click(detailButtons[0]);

    expect(onOpenDetail).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).toHaveBeenCalledWith(mockOpportunities[0]);
  });

  it('should render empty state when myOpportunities is empty', () => {
    renderMyOpportunitiesTab({ myOpportunities: [] });

    expect(screen.getByText('Ви ще не опублікували жодної власної можливості')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('should render loading state when loading is true', () => {
    renderMyOpportunitiesTab({ loading: true });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.queryByText('Ви ще не опублікували жодної власної можливості'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
  });
});
