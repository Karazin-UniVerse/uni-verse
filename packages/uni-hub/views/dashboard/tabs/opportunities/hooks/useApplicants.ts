import { useState, useCallback } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import type { OpportunityAppStatus } from '@core/constants/opportunities';
import { hasLoadFailed } from '@uni-hub/queries/load-state';
import { getOpportunityErrorMessage } from '../helpers';
import { invalidateOpportunities } from '../cache';
import { loadApplicants } from '../queries';
import { opportunityKeys } from '../queryKeys';

interface ApplicationStatusChange {
  application: OpportunityApplication;
  status: OpportunityAppStatus;
}

interface UseApplicantsResult {
  isOpen: boolean;
  applications: OpportunityApplication[];
  loading: boolean;
  isError: boolean;
  refetch: () => void;
  open: (opportunity: Opportunity) => void;
  close: () => void;
  handleUpdateStatus: (
    application: OpportunityApplication,
    status: OpportunityAppStatus,
  ) => Promise<void>;
}

export function useApplicants(): UseApplicantsResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [opportunityId, setOpportunityId] = useState<string | null>(null);

  const applicationsQuery = useQuery({
    queryKey: opportunityKeys.applicants(opportunityId ?? ''),
    queryFn: opportunityId ? () => loadApplicants(opportunityId) : skipToken,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ application, status }: ApplicationStatusChange) =>
      opportunitiesApi.updateApplicationStatus(application.id, {
        status,
        reapplyCount: application.reapplyCount ?? 0,
      }),
    onSettled: () => invalidateOpportunities(queryClient),
  });

  const open = useCallback(
    (opportunity: Opportunity): void => setOpportunityId(opportunity.id),
    [],
  );

  const close = useCallback((): void => setOpportunityId(null), []);

  const handleUpdateStatus = async (
    application: OpportunityApplication,
    status: OpportunityAppStatus,
  ): Promise<void> => {
    try {
      await updateStatusMutation.mutateAsync({ application, status });
    } catch (err: unknown) {
      toast.error(
        getOpportunityErrorMessage(
          err,
          formatMessage,
          formatMessage('opportunities.toast.statusUpdateError'),
        ),
      );
    }
  };

  return {
    isOpen: opportunityId !== null,
    applications: applicationsQuery.data ?? [],
    loading: applicationsQuery.isLoading,
    isError: hasLoadFailed(applicationsQuery),
    refetch: () => {
      void applicationsQuery.refetch();
    },
    open,
    close,
    handleUpdateStatus,
  };
}
