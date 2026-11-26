'use client';

import React, { useState } from 'react';
import { Button, Spinner, Empty, Modal } from '@una';
import type { OpportunityApplication } from '@core/types/opportunities';
import { OPPORTUNITY_APP_STATUS, type OpportunityAppStatus } from '@core/constants/opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { LoadErrorState } from '@uni-hub/components/common/LoadErrorState';
import { ConfirmModal } from '@ui';
import { ApplicantCard } from './ApplicantCard';
import styles from '../../OpportunitiesTab.module.scss';

export interface ApplicantsModalProps {
  open: boolean;
  onClose: () => void;
  applications: OpportunityApplication[];
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  onUpdateStatus: (application: OpportunityApplication, status: OpportunityAppStatus) => void;
}

interface PendingDecision {
  application: OpportunityApplication;
  status: OpportunityAppStatus;
}

export const ApplicantsModal: React.FC<ApplicantsModalProps> = ({
  open,
  onClose,
  applications,
  loading,
  isError,
  onRetry,
  onUpdateStatus,
}) => {
  const { formatMessage } = useLanguage();
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);

  const handleChangeStatus = (
    application: OpportunityApplication,
    status: OpportunityAppStatus,
  ): void => {
    if (status === OPPORTUNITY_APP_STATUS.UNDER_REVIEW) {
      onUpdateStatus(application, status);

      return;
    }

    setPendingDecision({ application, status });
  };

  const handleConfirmDecision = (): void => {
    if (pendingDecision) {
      onUpdateStatus(pendingDecision.application, pendingDecision.status);
    }

    setPendingDecision(null);
  };

  const isAccepting = pendingDecision?.status === OPPORTUNITY_APP_STATUS.ACCEPTED;

  let content;

  if (loading) {
    content = (
      <div className={styles.loadingBox}>
        <Spinner size="large" />
      </div>
    );
  } else if (isError) {
    content = <LoadErrorState onRetry={onRetry} />;
  } else if (applications.length === 0) {
    content = <Empty description={formatMessage('opportunities.applicantsModal.empty')} />;
  } else {
    content = (
      <div className={styles.listStack}>
        {applications.map((application) => (
          <ApplicantCard
            key={application.id}
            application={application}
            onChangeStatus={handleChangeStatus}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        closeOnClickOutside={pendingDecision === null}
        title={formatMessage('opportunities.applicantsModal.title', {
          count: applications.length,
        })}
        width={720}
      >
        <div className={styles.modalStack}>
          {content}

          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={onClose}>
              {formatMessage('opportunities.applicantsModal.close')}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={pendingDecision !== null}
        onClose={() => setPendingDecision(null)}
        onConfirm={handleConfirmDecision}
        title={formatMessage(
          isAccepting ? 'opportunities.confirm.acceptTitle' : 'opportunities.confirm.rejectTitle',
        )}
        message={formatMessage(
          isAccepting ? 'opportunities.confirm.accept' : 'opportunities.confirm.reject',
        )}
        cancelLabel={formatMessage('common.cancel')}
        confirmLabel={formatMessage(
          isAccepting
            ? 'opportunities.confirm.acceptConfirm'
            : 'opportunities.confirm.rejectConfirm',
        )}
        closeLabel={formatMessage('modal.close')}
        variant={isAccepting ? 'primary' : 'danger'}
      />
    </>
  );
};
