import React from 'react';
import { ModerationActions } from '@ui';
import { OPPORTUNITY_MODERATE_ACTION } from '@core/constants/opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useModeration } from '../hooks/useModeration';
import { ModerationRejectModal } from '../modals/ModerationRejectModal';
import styles from '../../OpportunitiesTab.module.scss';

interface OpportunityModerationPanelProps {
  opportunityId: string;
}

export const OpportunityModerationPanel: React.FC<OpportunityModerationPanelProps> = ({
  opportunityId,
}) => {
  const moderation = useModeration();
  const { formatMessage } = useLanguage();

  return (
    <div className={styles.detailModerationPanel}>
      <ModerationActions
        approveText={formatMessage('opportunities.moderation.approve')}
        reviseText={formatMessage('opportunities.moderation.revise')}
        rejectText={formatMessage('opportunities.moderation.reject')}
        onApprove={() =>
          void moderation.handleModerate(opportunityId, OPPORTUNITY_MODERATE_ACTION.APPROVE)
        }
        onOpenRejectModal={() => moderation.openRejectModal(opportunityId)}
        disabled={moderation.submitting}
      />
      <ModerationRejectModal
        rejectModal={moderation.rejectModal}
        onClose={moderation.closeRejectModal}
        onCommentChange={moderation.changeRejectComment}
        onConfirm={moderation.handleRejectConfirm}
        isSubmitting={moderation.submitting}
      />
    </div>
  );
};
