import React, { useId } from 'react';
import { Modal } from '../../una/Modal';
import { Button } from '../../una/Button';
import { TextInput } from '../../una/inputs/TextInput';
import { Select } from '../../una/Select';
import type {
  CreateOpportunityModalProps,
  OpportunityPaymentType,
} from './CreateOpportunityModal.types';
import styles from './CreateOpportunityModal.module.scss';

export const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  onSubmit,
  className,
  title = 'Створити можливість',
  submitting = false,
  titleLabel = 'Назва можливості',
  titlePlaceholder = 'Наприклад: Стажування у лабораторії біоінформатики',
  descLabel = 'Детальний опис',
  descPlaceholder = 'Вимоги, задачі, очікувані результати та графік роботи...',
  contactLabel = 'Контакти організатора',
  contactPlaceholder = 'Email, телефон або Telegram для зв’язку зі студентами',
  paymentTypeLabel = 'Тип винагороди',
  paymentDetailsLabel = 'Розмір або деталі оплати',
  paymentDetailsPlaceholder = 'Наприклад: 15 000 грн/міс або стипендіальна програма',
  unpaidOptionLabel = 'Без оплати / волонтерство',
  paidOptionLabel = 'Оплачувана',
  cancelText = 'Скасувати',
  submitText = 'Створити чернетку',
  savingText = 'Збереження...',
}) => {
  const titleId = useId();
  const descId = useId();
  const contactId = useId();
  const paymentTypeId = useId();
  const paymentDetailsId = useId();

  return (
    <Modal open={open} onClose={onClose} title={title} width={560} className={className}>
      <form onSubmit={onSubmit} className={styles.modalStack}>
        <div className={styles.fieldGroup}>
          <label htmlFor={titleId} className={styles.fieldLabel}>
            {titleLabel}
          </label>
          <TextInput
            id={titleId}
            placeholder={titlePlaceholder}
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={descId} className={styles.fieldLabel}>
            {descLabel}
          </label>
          <textarea
            id={descId}
            rows={5}
            className={styles.textarea}
            placeholder={descPlaceholder}
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={contactId} className={styles.fieldLabel}>
            {contactLabel}
          </label>
          <TextInput
            id={contactId}
            placeholder={contactPlaceholder}
            value={formData.ownerContactInfo}
            onChange={(e) => setFormData((prev) => ({ ...prev, ownerContactInfo: e.target.value }))}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={paymentTypeId} className={styles.fieldLabel}>
            {paymentTypeLabel}
          </label>
          <Select
            id={paymentTypeId}
            aria-label={paymentTypeLabel}
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
                label: unpaidOptionLabel,
              },
              {
                value: 'PAID',
                label: paidOptionLabel,
              },
            ]}
          />
        </div>

        {formData.paymentType === 'PAID' && (
          <div className={styles.fieldGroup}>
            <label htmlFor={paymentDetailsId} className={styles.fieldLabel}>
              {paymentDetailsLabel}
            </label>
            <TextInput
              id={paymentDetailsId}
              placeholder={paymentDetailsPlaceholder}
              value={formData.paymentDetails}
              onChange={(e) => setFormData((prev) => ({ ...prev, paymentDetails: e.target.value }))}
            />
          </div>
        )}

        <div className={styles.modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            {cancelText}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? savingText : submitText}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateOpportunityModal;
