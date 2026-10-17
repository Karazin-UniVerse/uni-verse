import { useState } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import type { OpportunityAppStatus } from '@core/constants/opportunities';
import { invalidateOpportunities } from '../cache';
import { hasLoadFailed, loadApplicants } from '../queries';
import { opportunityKeys } from '../queryKeys';

interface ApplicationStatusChange {
  applicationId: string;
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
  handleUpdateStatus: (applicationId: string, status: OpportunityAppStatus) => Promise<void>;
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
    mutationFn: ({ applicationId, status }: ApplicationStatusChange) =>
      opportunitiesApi.updateApplicationStatus(applicationId, status),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const open = (opportunity: Opportunity): void => setOpportunityId(opportunity.id);

  const close = (): void => setOpportunityId(null);

  const handleUpdateStatus = async (
    applicationId: string,
    status: OpportunityAppStatus,
  ): Promise<void> => {
    try {
      await updateStatusMutation.mutateAsync({ applicationId, status });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.statusUpdateError')));
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
