'use client';

import React, { useId } from 'react';
import { Button, TextInput, Modal } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
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
  const { formatMessage } = useLanguage();
  const applyMotivationId = useId();
  const applyContactId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formatMessage('opportunities.applyModal.title', {
        title: opportunityTitle || '',
      })}
      width={560}
    >
      <form onSubmit={onSubmit} className={styles.modalStack}>
        <div className={styles.fieldGroup}>
          <label htmlFor={applyMotivationId} className={styles.fieldLabel}>
            {formatMessage('opportunities.applyModal.motivationLabel')}
          </label>
          <textarea
            id={applyMotivationId}
            rows={4}
            className={styles.textarea}
            placeholder={formatMessage('opportunities.applyModal.motivationPlaceholder')}
            value={motivation}
            onChange={(e) => onMotivationChange(e.target.value)}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={applyContactId} className={styles.fieldLabel}>
            {formatMessage('opportunities.applyModal.contactLabel')}
          </label>
          <TextInput
            id={applyContactId}
            placeholder={formatMessage('opportunities.applyModal.contactPlaceholder')}
            value={contactInfo}
            onChange={(e) => onContactInfoChange(e.target.value)}
          />
        </div>

        <div className={styles.modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            {formatMessage('opportunities.applyModal.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting || !motivation.trim()}>
            {submitting
              ? formatMessage('opportunities.applyModal.submitting')
              : formatMessage('opportunities.applyModal.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
