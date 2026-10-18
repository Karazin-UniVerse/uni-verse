import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@una';
import { ROLE } from '@core/constants/roles';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { OPPORTUNITY_SUB_TAB, type OpportunitySubTab } from './opportunities/constants';
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

const {
  mockOpenCreate,
  mockCloseCreate,
  mockSetActiveSubTab,
  mockRefetchActiveList,
  mockRefetchOpportunities,
} = vi.hoisted(() => ({
  mockOpenCreate: vi.fn(),
  mockCloseCreate: vi.fn(),
  mockSetActiveSubTab: vi.fn(),
  mockRefetchActiveList: vi.fn().mockResolvedValue(undefined),
  mockRefetchOpportunities: vi.fn().mockResolvedValue(undefined),
}));

let mockActiveSubTab: OpportunitySubTab = OPPORTUNITY_SUB_TAB.Catalog;
let mockModerationItems: unknown[] = [];

vi.mock('./opportunities', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./opportunities')>();

  return {
    ...actual,
    useOpportunitiesData: (isModerator: boolean) => {
      const [activeSubTab, setActiveSubTab] = React.useState<OpportunitySubTab>(mockActiveSubTab);

      return {
        activeSubTab,
        setActiveSubTab: (tab: OpportunitySubTab) => {
          mockSetActiveSubTab(tab);
          setActiveSubTab(tab);
        },
        search: '',
        setSearch: vi.fn(),
        paymentFilter: '',
        setPaymentFilter: vi.fn(),
        catalog: { items: [], loading: false, refetch: vi.fn(), setItems: vi.fn() },
        myOpportunities: { items: [], loading: false, refetch: vi.fn(), setItems: vi.fn() },
        myApplications: { items: [], loading: false, refetch: vi.fn(), setItems: vi.fn() },
        moderationQueue: {
          items: isModerator ? mockModerationItems : [],
          loading: false,
          refetch: vi.fn(),
          setItems: vi.fn(),
        },
        refetchActiveList: mockRefetchActiveList,
        refetchOpportunities: mockRefetchOpportunities,
      };
    },
    useCreateOpportunity: () => {
      const [isOpen, setIsOpen] = React.useState(false);

      return {
        isOpen,
        setIsOpen,
        formData: {
          title: '',
          description: '',
          ownerContactInfo: '',
          paymentType: 'UNPAID',
          paymentDetails: '',
        },
        setFormData: vi.fn(),
        creating: false,
        isEdit: false,
        openCreate: vi.fn(() => {
          mockOpenCreate();
          setIsOpen(true);
        }),
        openEdit: vi.fn(),
        close: vi.fn(() => {
          mockCloseCreate();
          setIsOpen(false);
        }),
        handleSubmit: vi.fn(),
      };
    },
    useApplicants: () => ({
      isOpen: false,
      setIsOpen: vi.fn(),
      applications: [],
      loading: false,
      open: vi.fn(),
      handleUpdateStatus: vi.fn(),
    }),
    useWithdrawApplication: () => ({
      withdrawApplicationId: null,
      setWithdrawApplicationId: vi.fn(),
      withdrawing: false,
      handleWithdraw: vi.fn(),
    }),
    useModeration: () => ({
      rejectModal: { open: false, id: null, comment: '' },
      submitting: false,
      openRejectModal: vi.fn(),
      closeRejectModal: vi.fn(),
      changeRejectComment: vi.fn(),
      handleModerate: vi.fn(),
      handleRejectConfirm: vi.fn(),
    }),
    CreateOpportunityModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
      open ? (
        <dialog open aria-label="Створити можливість">
          <h2>Створити можливість</h2>
          <button type="button" onClick={onClose}>
            Закрити
          </button>
        </dialog>
      ) : null,
    OpportunityDetailModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
      open ? (
        <dialog open aria-label="Деталі можливості">
          <button type="button" onClick={onClose}>
            Закрити
          </button>
        </dialog>
      ) : null,
    ApplyOpportunityModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
      open ? (
        <dialog open aria-label="Подати відгук">
          <button type="button" onClick={onClose}>
            Закрити
          </button>
        </dialog>
      ) : null,
    ApplicantsModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
      open ? (
        <dialog open aria-label="Кандидати">
          <button type="button" onClick={onClose}>
            Закрити
          </button>
        </dialog>
      ) : null,
    ModerationRejectModal: ({
      rejectModal,
      onClose,
    }: {
      rejectModal: { open: boolean };
      onClose: () => void;
    }) =>
      rejectModal?.open ? (
        <dialog open aria-label="Модерація відхилення">
          <button type="button" onClick={onClose}>
            Закрити
          </button>
        </dialog>
      ) : null,
  };
});

vi.mock('@ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();

  return {
    ...actual,
    ConfirmModal: ({
      open,
      title,
      onClose,
    }: {
      open: boolean;
      onClose: () => void;
      title?: string;
    }) =>
      open ? (
        <dialog open aria-label={title ?? 'Підтвердження'}>
          <button type="button" onClick={onClose}>
            Закрити
          </button>
        </dialog>
      ) : null,
  };
});

const renderOpportunitiesTab = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <LanguageProvider>
          <OpportunitiesTab />
        </LanguageProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
};

describe('OpportunitiesTab component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = {
      userId: 'user-1',
      roles: [ROLE.OPPORTUNITIES_USER],
      email: 'student@example.com',
      name: 'Student User',
    };
    mockActiveSubTab = OPPORTUNITY_SUB_TAB.Catalog;
    mockModerationItems = [];
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
    expect(screen.getByRole('button', { name: /створити можливість/i })).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-catalog');
  });

  it('should render Moderation Queue tab when current user has OPPORTUNITIES_MODERATOR role', () => {
    mockCurrentUser = {
      ...mockCurrentUser,
      roles: [ROLE.OPPORTUNITIES_MODERATOR],
    };
    mockModerationItems = [{ id: 'mod-1' }];

    renderOpportunitiesTab();

    const moderationTab = screen.getByRole('tab', { name: /модерація/i });

    expect(moderationTab).toBeInTheDocument();
    expect(moderationTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should switch active sub-tab when clicking a tab button', async () => {
    const user = userEvent.setup();

    renderOpportunitiesTab();

    const myOpportunitiesTab = screen.getByRole('tab', { name: /мої можливості/i });
    const catalogTab = screen.getByRole('tab', { name: /каталог/i });

    await user.click(myOpportunitiesTab);

    expect(mockSetActiveSubTab).toHaveBeenCalledWith(OPPORTUNITY_SUB_TAB.MyOpportunities);
    expect(myOpportunitiesTab).toHaveAttribute('aria-selected', 'true');
    expect(catalogTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-my-opportunities');

    const myApplicationsTab = screen.getByRole('tab', { name: /мої відгуки/i });

    await user.click(myApplicationsTab);

    expect(mockSetActiveSubTab).toHaveBeenCalledWith(OPPORTUNITY_SUB_TAB.MyApplications);
    expect(myApplicationsTab).toHaveAttribute('aria-selected', 'true');
    expect(myOpportunitiesTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-my-applications');
  });

  it('should trigger create opportunity modal when clicking Post Opportunity button', async () => {
    const user = userEvent.setup();

    renderOpportunitiesTab();

    expect(screen.queryByRole('dialog', { name: /створити можливість/i })).not.toBeInTheDocument();

    const createButton = screen.getByRole('button', { name: /створити можливість/i });

    await user.click(createButton);

    expect(mockOpenCreate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: /створити можливість/i })).toBeInTheDocument();
  });
});
