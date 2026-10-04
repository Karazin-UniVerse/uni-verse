'use client';

import React, { useId } from 'react';
import { Button, TextInput, Select, Modal } from '@una';
import type { OpportunityPaymentType } from '@uni-hub/types';
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
  const createTitleId = useId();
  const createDescId = useId();
  const createContactId = useId();
  const createPaymentDetailsId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Створити нову можливість"
      width={560}
    >
      <form onSubmit={onSubmit} className={styles.modalStack}>
        <div className={styles.fieldGroup}>
          <label htmlFor={createTitleId} className={styles.fieldLabel}>
            Назва можливості *
          </label>
          <TextInput
            id={createTitleId}
            placeholder="Наприклад: React-розробник у студентський стартап"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={createDescId} className={styles.fieldLabel}>
            Опис, завдання та вимоги до кандидата *
          </label>
          <textarea
            id={createDescId}
            rows={5}
            className={styles.textarea}
            placeholder="Детально розкажіть про проект, задачі, очікувану зайнятість та необхідні навички..."
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={createContactId} className={styles.fieldLabel}>
            Контактні дані організатора *
          </label>
          <TextInput
            id={createContactId}
            placeholder="Telegram (@username) або Email"
            value={formData.ownerContactInfo}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, ownerContactInfo: e.target.value }))
            }
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Тип винагороди</span>
          <Select
            value={formData.paymentType}
            onChange={(val) =>
              setFormData((prev) => ({
                ...prev,
                paymentType: val as OpportunityPaymentType,
              }))
            }
            options={[
              { value: 'UNPAID', label: 'Неоплачувана (Практика, досвід)' },
              { value: 'PAID', label: 'Оплачувана' },
            ]}
          />
        </div>

        {formData.paymentType === 'PAID' && (
          <div className={styles.fieldGroup}>
            <label htmlFor={createPaymentDetailsId} className={styles.fieldLabel}>
              Деталі та розмір оплати
            </label>
            <TextInput
              id={createPaymentDetailsId}
              placeholder="Наприклад: $400/місяць або 5000 грн за етап"
              value={formData.paymentDetails}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, paymentDetails: e.target.value }))
              }
            />
          </div>
        )}

        <div className={styles.modalFooter}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Скасувати
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Збереження...' : 'Створити чернетку'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
