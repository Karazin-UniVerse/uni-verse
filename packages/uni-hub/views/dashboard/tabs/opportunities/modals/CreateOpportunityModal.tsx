'use client';

import React, { useId } from 'react';
import { Button, TextInput, Select, Modal } from '@una';
import type { OpportunityPaymentType } from '@uni-hub/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { CreateOpportunityFormData } from '../types';
import styles from '../../OpportunitiesTab.module.scss';

export interface CreateOpportunityModalProps {
  open: boolean;
  onClose: () => void;
  formData: CreateOpportunityFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateOpportunityFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  onSubmit,
  submitting,
}) => {
  const { formatMessage } = useLanguage();
  const createTitleId = useId();
  const createDescId = useId();
  const createContactId = useId();
  const createPaymentDetailsId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formatMessage('opportunities.createModal.title')}
      width={560}
    >
      <form onSubmit={onSubmit} className={styles.modalStack}>
        <div className={styles.fieldGroup}>
          <label htmlFor={createTitleId} className={styles.fieldLabel}>
            {formatMessage('opportunities.createModal.titleLabel')}
          </label>
          <TextInput
            id={createTitleId}
            placeholder={formatMessage('opportunities.createModal.titlePlaceholder')}
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={createDescId} className={styles.fieldLabel}>
            {formatMessage('opportunities.createModal.descLabel')}
          </label>
          <textarea
            id={createDescId}
            rows={5}
            className={styles.textarea}
            placeholder={formatMessage('opportunities.createModal.descPlaceholder')}
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={createContactId} className={styles.fieldLabel}>
            {formatMessage('opportunities.createModal.contactLabel')}
          </label>
          <TextInput
            id={createContactId}
            placeholder={formatMessage('opportunities.createModal.contactPlaceholder')}
            value={formData.ownerContactInfo}
            onChange={(e) => setFormData((prev) => ({ ...prev, ownerContactInfo: e.target.value }))}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>
            {formatMessage('opportunities.createModal.paymentTypeLabel')}
          </span>
          <Select
            value={formData.paymentType}
            onChange={(val) =>
              setFormData((prev) => ({
                ...prev,
                paymentType: val as OpportunityPaymentType,
              }))
            }
            options={[
              {
                value: 'UNPAID',
                label: formatMessage('opportunities.createModal.unpaidOption'),
              },
              {
                value: 'PAID',
                label: formatMessage('opportunities.createModal.paidOption'),
              },
            ]}
          />
        </div>

        {formData.paymentType === 'PAID' && (
          <div className={styles.fieldGroup}>
            <label htmlFor={createPaymentDetailsId} className={styles.fieldLabel}>
              {formatMessage('opportunities.createModal.paymentDetailsLabel')}
            </label>
            <TextInput
              id={createPaymentDetailsId}
              placeholder={formatMessage('opportunities.createModal.paymentDetailsPlaceholder')}
              value={formData.paymentDetails}
              onChange={(e) => setFormData((prev) => ({ ...prev, paymentDetails: e.target.value }))}
            />
          </div>
        )}

        <div className={styles.modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            {formatMessage('opportunities.createModal.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? formatMessage('opportunities.createModal.saving')
              : formatMessage('opportunities.createModal.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
