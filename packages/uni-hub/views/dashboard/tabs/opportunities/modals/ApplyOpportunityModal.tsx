'use client';

import React, { useId } from 'react';
import { Button, TextInput, Modal } from '@una';
import styles from '../../OpportunitiesTab.module.scss';

export interface ApplyOpportunityModalProps {
  open: boolean;
  onClose: () => void;
  opportunityTitle?: string;
  motivation: string;
  onMotivationChange: (val: string) => void;
  contactInfo: string;
  onContactInfoChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export const ApplyOpportunityModal: React.FC<ApplyOpportunityModalProps> = ({
  open,
  onClose,
  opportunityTitle,
  motivation,
  onMotivationChange,
  contactInfo,
  onContactInfoChange,
  onSubmit,
  submitting,
}) => {
  const applyMotivationId = useId();
  const applyContactId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Відгук: ${opportunityTitle || ''}`}
      width={560}
    >
      <form onSubmit={onSubmit} className={styles.modalStack}>
        <div className={styles.fieldGroup}>
          <label htmlFor={applyMotivationId} className={styles.fieldLabel}>
            Супровідне повідомлення (чому вам цікавий цей проект) *
          </label>
          <textarea
            id={applyMotivationId}
            rows={4}
            className={styles.textarea}
            placeholder="Коротко опишіть ваш досвід, стек та чому ви хочете взяти участь..."
            value={motivation}
            onChange={(e) => onMotivationChange(e.target.value)}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={applyContactId} className={styles.fieldLabel}>
            Ваш Telegram або номер телефону для звʼязку
          </label>
          <TextInput
            id={applyContactId}
            placeholder="@username або +380..."
            value={contactInfo}
            onChange={(e) => onContactInfoChange(e.target.value)}
          />
        </div>

        <div className={styles.modalFooter}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Скасувати
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !motivation.trim()}
          >
            {submitting ? 'Відправка...' : 'Надіслати відгук'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
