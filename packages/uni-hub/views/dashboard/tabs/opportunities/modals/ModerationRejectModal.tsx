'use client';

import React from 'react';
import { Button, Modal } from '@una';
import type { RejectModalState } from '../types';
import styles from '../../OpportunitiesTab.module.scss';

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
  return (
    <Modal
      open={rejectModal.open}
      onClose={onClose}
      title="Зауваження або повернення на доопрацювання"
      width={540}
    >
      <div className={styles.modalStack}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Опишіть зауваження або причину (буде надіслано автору):
          </label>
          <textarea
            rows={4}
            className={styles.textarea}
            placeholder="Вкажіть, що саме необхідно виправити перед повторною подачею..."
            value={rejectModal.comment}
            onChange={(e) => onCommentChange(e.target.value)}
          />
        </div>

        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={onClose}>
            Скасувати
          </Button>
          <Button
            variant="primary"
            disabled={!rejectModal.comment.trim()}
            onClick={() => {
              if (rejectModal.id) {
                onConfirm(rejectModal.id, 'REQUIRE_CHANGES', rejectModal.comment);
              }
            }}
            style={{
              backgroundColor: 'var(--warning-color, #f59e0b)',
              borderColor: 'var(--warning-color, #f59e0b)',
              color: '#fff',
            }}
          >
            На доопрацювання
          </Button>
          <Button
            variant="primary"
            disabled={!rejectModal.comment.trim()}
            onClick={() => {
              if (rejectModal.id) {
                onConfirm(rejectModal.id, 'REJECT', rejectModal.comment);
              }
            }}
            style={{
              backgroundColor: 'var(--error-color, #ef4444)',
              borderColor: 'var(--error-color, #ef4444)',
              color: '#fff',
            }}
          >
            Відхилити
          </Button>
        </div>
      </div>
    </Modal>
  );
};
