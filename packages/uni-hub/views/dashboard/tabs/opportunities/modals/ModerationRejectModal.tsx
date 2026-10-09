'use client';

import React from 'react';
import { ModerationRejectModal as ModerationRejectModalUI } from '@universe/ui';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { RejectModalState } from '../types';

export interface ModerationRejectModalProps {
  rejectModal: RejectModalState;
  onClose: () => void;
  onCommentChange: (comment: string) => void;
  onConfirm: (id: string, action: 'REQUIRE_CHANGES' | 'REJECT', comment: string) => void;
}

export const ModerationRejectModal: React.FC<ModerationRejectModalProps> = ({
  rejectModal,
  onClose,
  onCommentChange,
  onConfirm,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <ModerationRejectModalUI
      open={rejectModal.open}
      onClose={onClose}
      title={formatMessage('opportunities.rejectModal.title')}
      comment={rejectModal.comment}
      onCommentChange={onCommentChange}
      commentLabel={formatMessage('opportunities.rejectModal.commentLabel')}
      placeholder={formatMessage('opportunities.rejectModal.placeholder')}
      cancelText={formatMessage('opportunities.rejectModal.cancel')}
      reviseText={formatMessage('opportunities.rejectModal.revise')}
      rejectText={formatMessage('opportunities.rejectModal.reject')}
      onRevise={() => {
        if (rejectModal.id) {
          onConfirm(rejectModal.id, 'REQUIRE_CHANGES', rejectModal.comment);
        }
      }}
      onReject={() => {
        if (rejectModal.id) {
          onConfirm(rejectModal.id, 'REJECT', rejectModal.comment);
        }
      }}
    />
  );
};
