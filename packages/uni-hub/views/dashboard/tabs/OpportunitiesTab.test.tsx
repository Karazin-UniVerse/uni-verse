import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROLE } from '@core/constants/roles';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useOpportunitiesStore } from '@uni-hub/store/useOpportunitiesStore';
import { createTestQueryClient, withAppProviders } from '@uni-hub/utils/test-utils';
import { OPPORTUNITY_SUB_TAB } from './opportunities/constants';
import { opportunityKeys } from './opportunities/queryKeys';
import { buildOpportunity } from './opportunities/test-utils';
import { OpportunitiesTab } from './OpportunitiesTab';

let mockCurrentUser = {
  userId: 'user-1',
  roles: [ROLE.OPPORTUNITIES_USER] as string[],
  email: 'student@example.com',
  name: 'Student User',
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@uni-hub/hooks/useCurrentUser', () => ({
  useCurrentUser: () => mockCurrentUser,
}));

const renderOpportunitiesTab = (queryClient = createTestQueryClient()) => {
  return render(withAppProviders(<OpportunitiesTab />, queryClient));
};

describe('OpportunitiesTab component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOpportunitiesStore.getState().reset();
    mockCurrentUser = {
      userId: 'user-1',
      roles: [ROLE.OPPORTUNITIES_USER],
      email: 'student@example.com',
      name: 'Student User',
    };

    vi.spyOn(opportunitiesApi, 'getOpportunities').mockResolvedValue({ data: [] });
    vi.spyOn(opportunitiesApi, 'getMyOpportunities').mockResolvedValue({ data: [] });
    vi.spyOn(opportunitiesApi, 'getMyApplications').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render tab navigation for Catalog, My Opportunities, and My Applications for regular user', () => {
    renderOpportunitiesTab();

    expect(screen.getByRole('tablist')).toBeInTheDocument();

    const catalogTab = screen.getByRole('tab', { name: /каталог/i });
    const myOpportunitiesTab = screen.getByRole('tab', { name: /мої можливості/i });
    const myApplicationsTab = screen.getByRole('tab', { name: /мої відгуки/i });

    expect(catalogTab).toBeInTheDocument();
    expect(catalogTab).toHaveAttribute('aria-selected', 'true');
    expect(myOpportunitiesTab).toBeInTheDocument();
    expect(myOpportunitiesTab).toHaveAttribute('aria-selected', 'false');
    expect(myApplicationsTab).toBeInTheDocument();
    expect(myApplicationsTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByRole('tab', { name: /модерація/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /створити можливість/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-catalog');
  });

  it('should render Moderation Queue tab when current user has OPPORTUNITIES_MODERATOR role', () => {
    mockCurrentUser = {
      ...mockCurrentUser,
      roles: [ROLE.OPPORTUNITIES_MODERATOR],
    };

    const queryClient = createTestQueryClient();

    queryClient.setQueryData(opportunityKeys.moderation(), [buildOpportunity('mod-1')]);

    renderOpportunitiesTab(queryClient);

    const moderationTab = screen.getByRole('tab', { name: /модерація/i });

    expect(moderationTab).toBeInTheDocument();
    expect(moderationTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should render Create Opportunity button for moderator only on My Opportunities tab', async (): Promise<void> => {
    const user = userEvent.setup();

    mockCurrentUser = {
      ...mockCurrentUser,
      roles: [ROLE.OPPORTUNITIES_USER, ROLE.OPPORTUNITIES_MODERATOR],
    };

    renderOpportunitiesTab();

    expect(screen.queryByRole('button', { name: /створити можливість/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /мої можливості/i }));
    expect(screen.getByRole('button', { name: /створити можливість/i })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /модерація/i }));
    expect(screen.queryByRole('button', { name: /створити можливість/i })).not.toBeInTheDocument();
  });

  it('should switch active sub-tab when clicking a tab button', async (): Promise<void> => {
    const user = userEvent.setup();

    renderOpportunitiesTab();

    const myOpportunitiesTab = screen.getByRole('tab', { name: /мої можливості/i });
    const catalogTab = screen.getByRole('tab', { name: /каталог/i });

    await user.click(myOpportunitiesTab);

    expect(useOpportunitiesStore.getState().activeSubTab).toBe(OPPORTUNITY_SUB_TAB.MyOpportunities);
    expect(myOpportunitiesTab).toHaveAttribute('aria-selected', 'true');
    expect(catalogTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-my-opportunities');
    expect(screen.getByRole('button', { name: /створити можливість/i })).toBeInTheDocument();

    const myApplicationsTab = screen.getByRole('tab', { name: /мої відгуки/i });

    await user.click(myApplicationsTab);

    expect(useOpportunitiesStore.getState().activeSubTab).toBe(OPPORTUNITY_SUB_TAB.MyApplications);
    expect(myApplicationsTab).toHaveAttribute('aria-selected', 'true');
    expect(myOpportunitiesTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-my-applications');
    expect(screen.queryByRole('button', { name: /створити можливість/i })).not.toBeInTheDocument();
  });

  it('should trigger create opportunity modal when clicking Post Opportunity button', async (): Promise<void> => {
    const user = userEvent.setup();

    renderOpportunitiesTab();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /мої можливості/i }));

    const createButton = screen.getByRole('button', { name: /створити можливість/i });

    await user.click(createButton);

    expect(screen.getByRole('dialog', { name: /створити нову можливість/i })).toBeInTheDocument();
  });
});
