import React from 'react';
import { OPPORTUNITY_MODERATE_ACTION } from '@core/constants/opportunities';
import { useModeration } from '../hooks/useModeration';
import { ModerationRejectModal } from '../modals/ModerationRejectModal';
import { ModerationActions } from './ModerationActions';
import styles from '../../OpportunitiesTab.module.scss';

interface OpportunityModerationPanelProps {
  opportunityId: string;
}

export const OpportunityModerationPanel: React.FC<OpportunityModerationPanelProps> = ({
  opportunityId,
}) => {
  const moderation = useModeration();

  return (
    <div className={styles.detailModerationPanel}>
      <ModerationActions
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
