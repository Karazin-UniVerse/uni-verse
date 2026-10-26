import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import type { OpportunityApplication } from '@core/types/opportunities';
import { MyApplicationsTab, type MyApplicationsTabProps } from './MyApplicationsTab';

const mockApplications: OpportunityApplication[] = [
  {
    id: 'app-sub-12345678',
    applicantName: 'Test Applicant',
    contactInfo: 'applicant@example.com',
    motivation: 'I am passionate about open source and React.',
    status: 'SUBMITTED',
    ownerComment: null,
    opportunityId: 'opp-1',
    opportunity: {
      id: 'opp-1',
      title: 'Frontend Intern',
      description: 'Exciting frontend internship with React.',
      ownerContactInfo: 'mentor@example.com',
      status: 'PUBLISHED',
      lifecycleState: 'ACTIVE',
      paymentType: 'PAID',
      paymentDetails: '300$ / month',
      ownerId: 'owner-1',
      owner: {
        id: 'owner-1',
        name: 'Alice Johnson',
        email: 'alice@example.com',
      },
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    },
    applicantId: 'user-1',
    createdAt: '2026-10-10T12:00:00.000Z',
    updatedAt: '2026-10-10T12:00:00.000Z',
  },
  {
    id: 'app-rev-23456789',
    applicantName: 'Test Applicant',
    contactInfo: 'applicant@example.com',
    motivation: null,
    status: 'UNDER_REVIEW',
    ownerComment: 'Reviewing your portfolio right now.',
    opportunityId: 'opp-2',
    opportunity: {
      id: 'opp-2',
      title: 'Backend Volunteer',
      description: 'Volunteer backend role.',
      ownerContactInfo: 'lead@example.com',
      status: 'PUBLISHED',
      lifecycleState: 'ACTIVE',
      paymentType: 'UNPAID',
      paymentDetails: null,
      ownerId: 'owner-2',
      owner: {
        id: 'owner-2',
        name: null,
        email: 'bob@example.com',
      },
      createdAt: '2026-10-02T10:00:00.000Z',
      updatedAt: '2026-10-02T10:00:00.000Z',
    },
    applicantId: 'user-1',
    createdAt: '2026-10-11T12:00:00.000Z',
    updatedAt: '2026-10-11T12:00:00.000Z',
  },
];

const renderMyApplicationsTab = (props: Partial<MyApplicationsTabProps> = {}) => {
  const defaultProps: MyApplicationsTabProps = {
    loading: false,
    isError: false,
    onRetry: vi.fn(),
    myApplications: mockApplications,
    onWithdraw: vi.fn(),
  };

  return {
    ...render(
      withLanguage(<MyApplicationsTab {...defaultProps} {...props} />),
    ),
    props: { ...defaultProps, ...props },
  };
};

describe('MyApplicationsTab component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should render list of user applications with opportunity title and status badge', () => {
    renderMyApplicationsTab();

    expect(screen.getByRole('heading', { level: 3, name: 'Frontend Intern' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Backend Volunteer' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Надіслано')).toBeInTheDocument();
    expect(screen.getByText('На розгляді')).toBeInTheDocument();
    expect(screen.getByText('app-sub-')).toBeInTheDocument();
    expect(screen.getByText('app-rev-')).toBeInTheDocument();
    expect(screen.getAllByText(/Подано/i)).toHaveLength(2);
  });

  it('should render opportunity owner details, payment info, motivation, and owner feedback', () => {
    renderMyApplicationsTab();

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('mentor@example.com')).toBeInTheDocument();
    expect(screen.getByText('Оплачувана (300$ / month)')).toBeInTheDocument();
    expect(screen.getByText('Ваш супровідний лист / мотивація:')).toBeInTheDocument();
    expect(screen.getByText('I am passionate about open source and React.')).toBeInTheDocument();

    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText('lead@example.com')).toBeInTheDocument();
    expect(screen.getByText('Практика')).toBeInTheDocument();
    expect(screen.getByText(/Відповідь автора пропозиції:/i)).toBeInTheDocument();
    expect(screen.getByText('Reviewing your portfolio right now.')).toBeInTheDocument();
  });

  it('should render fallback default title when opportunity title is not provided', () => {
    const appWithoutTitle: OpportunityApplication = {
      ...mockApplications[0],
      id: 'app-no-title-1',
      opportunity: undefined,
    };

    renderMyApplicationsTab({ myApplications: [appWithoutTitle] });

    expect(
      screen.getByRole('heading', { level: 3, name: 'Проектна можливість' }),
    ).toBeInTheDocument();
  });

  it('should render withdraw button and call onWithdraw when clicked for eligible statuses', async () => {
    const user = userEvent.setup();
    const onWithdraw = vi.fn();

    renderMyApplicationsTab({ onWithdraw });

    const withdrawButtons = screen.getAllByRole('button', { name: /відкликати відгук/i });

    expect(withdrawButtons).toHaveLength(2);

    await user.click(withdrawButtons[0]);

    expect(onWithdraw).toHaveBeenCalledTimes(1);
    expect(onWithdraw).toHaveBeenCalledWith('app-sub-12345678');

    await user.click(withdrawButtons[1]);

    expect(onWithdraw).toHaveBeenCalledTimes(2);
    expect(onWithdraw).toHaveBeenCalledWith('app-rev-23456789');
  });

  it('should not render withdraw button when application status is terminal (ACCEPTED, REJECTED, WITHDRAWN)', () => {
    const terminalApplications: OpportunityApplication[] = [
      {
        ...mockApplications[0],
        id: 'app-acc-11111111',
        status: 'ACCEPTED',
      },
      {
        ...mockApplications[0],
        id: 'app-rej-22222222',
        status: 'REJECTED',
      },
      {
        ...mockApplications[0],
        id: 'app-wit-33333333',
        status: 'WITHDRAWN',
      },
    ];

    renderMyApplicationsTab({ myApplications: terminalApplications });

    expect(screen.queryByRole('button', { name: /відкликати відгук/i })).not.toBeInTheDocument();
    expect(screen.getByText('Вашу кандидатуру схвалено організатором')).toBeInTheDocument();
    expect(screen.getByText('Організатор відхилив відгук')).toBeInTheDocument();
    expect(screen.getByText('Ви відкликали цей відгук')).toBeInTheDocument();
  });

  it('should render empty state when myApplications is empty', () => {
    renderMyApplicationsTab({ myApplications: [] });

    expect(screen.getByText('Ви ще не відгукувалися на жодну можливість')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /відкликати відгук/i })).not.toBeInTheDocument();
  });

  it('should render loading state when loading is true', () => {
    renderMyApplicationsTab({ loading: true });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.queryByText('Ви ще не відгукувалися на жодну можливість'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });
});
