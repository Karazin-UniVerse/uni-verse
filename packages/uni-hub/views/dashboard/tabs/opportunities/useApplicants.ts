import { useState } from 'react';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { asList } from '@uni-hub/utils/arrays';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity, OpportunityApplication, OpportunityAppStatus } from '@uni-hub/types';

export function useApplicants() {
  const toast = useToast();
  const { formatMessage } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [applications, setApplications] = useState<OpportunityApplication[]>([]);
  const [loading, setLoading] = useState(false);

  const open = async (opportunity: Opportunity): Promise<void> => {
    setIsOpen(true);
    setLoading(true);

    try {
      const response = await opportunitiesApi.getOpportunityApplications(opportunity.id);

      setApplications(asList(response.data));
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    applicationId: string,
    status: OpportunityAppStatus,
  ): Promise<void> => {
    try {
      await opportunitiesApi.updateApplicationStatus(applicationId, status);
      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId ? { ...application, status } : application,
        ),
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.statusUpdateError')));
    }
  };

  return { isOpen, setIsOpen, applications, loading, open, handleUpdateStatus };
}
