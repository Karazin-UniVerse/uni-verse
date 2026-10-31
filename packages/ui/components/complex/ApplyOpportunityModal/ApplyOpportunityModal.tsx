import React, { useId } from 'react';
import { Modal } from '../../una/Modal';
import { Button } from '../../una/Button';
import { TextInput } from '../../una/inputs/TextInput';
import type { ApplyOpportunityModalProps } from './ApplyOpportunityModal.types';
import styles from './ApplyOpportunityModal.module.scss';

export const ApplyOpportunityModal: React.FC<ApplyOpportunityModalProps> = ({
  open,
  onClose,
  title,
  motivation,
  onMotivationChange,
  contactInfo,
  onContactInfoChange,
  onSubmit,
  motivationLabel,
  motivationPlaceholder,
  contactLabel,
  contactPlaceholder,
  cancelText,
  submitText,
  submittingText,
  contactHint,
  className,
  submitting = false,
}) => {
  const motivationId = useId();
  const contactId = useId();
  const contactHintId = useId();

  return (
    <Modal open={open} onClose={onClose} title={title} width={560} className={className}>
      <form onSubmit={onSubmit} className={styles.modalStack}>
        <div className={styles.fieldGroup}>
          <label htmlFor={motivationId} className={styles.fieldLabel}>
            {motivationLabel}
          </label>
          <textarea
            id={motivationId}
            rows={4}
            className={styles.textarea}
            placeholder={motivationPlaceholder}
            value={motivation}
            onChange={(e) => onMotivationChange(e.target.value)}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={contactId} className={styles.fieldLabel}>
            {contactLabel}
          </label>
          <TextInput
            id={contactId}
            aria-describedby={contactHint ? contactHintId : undefined}
            placeholder={contactPlaceholder}
            value={contactInfo}
            onChange={(e) => onContactInfoChange(e.target.value)}
          />
          {contactHint && (
            <small id={contactHintId} className={styles.fieldHint}>
              {contactHint}
            </small>
          )}
        </div>

        <div className={styles.modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            {cancelText}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting || !motivation.trim()}>
            {submitting ? submittingText : submitText}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ApplyOpportunityModal;
