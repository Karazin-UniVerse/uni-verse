import React, { useId } from 'react';
import { Mail, Send } from 'lucide-react';
import { Modal } from '../../una/Modal';
import { Button } from '../../una/Button';
import { Tag } from '../../una/Tag';
import { Select } from '../../una/Select';
import type { OpportunityDetailModalProps } from './OpportunityDetailModal.types';
import styles from './OpportunityDetailModal.module.scss';

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  open,
  onClose,
  title,
  paymentTagText,
  statusBadge,
  lifecycleTagText,
  organizerName,
  publishedDateText,
  descriptionText,
  contactValue,
  onSendToReview,
  lifecycleState,
  onLifecycleChange,
  onOpenApply,
  className,
  paymentTone = 'neutral',
  organizerLabel = 'Організатор:',
  descriptionTitle = 'Опис можливості',
  contactLabel = 'Контакти:',
  isOwner = false,
  canSendToReview = false,
  sendToReviewText = 'Відправити на модерацію',
  manageTitle = 'Керування можливістю (автор)',
  phaseLabel = 'Фаза:',
  lifecycleOptions = [],
  closeText = 'Закрити',
  canApply = false,
  applyText = 'Подати заявку',
}) => {
  const phaseSelectId = useId();

  return (
    <Modal open={open} onClose={onClose} title={title} width={680} className={className}>
      <div className={styles.modalStack}>
        <div className={styles.tagsRow}>
          {paymentTagText && <Tag tone={paymentTone}>{paymentTagText}</Tag>}
          {statusBadge}
          {lifecycleTagText && <Tag tone="info">{lifecycleTagText}</Tag>}
        </div>

        {(organizerName || publishedDateText) && (
          <div className={styles.metaRow}>
            {organizerName && (
              <span>
                {organizerLabel} <strong>{organizerName}</strong>
              </span>
            )}
            {organizerName && publishedDateText && <span className={styles.metaDot}>•</span>}
            {publishedDateText && <span>{publishedDateText}</span>}
          </div>
        )}

        {descriptionText && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>{descriptionTitle}</div>
            <div className={styles.detailSectionText}>{descriptionText}</div>
          </div>
        )}

        {contactValue && (
          <div className={styles.contactRow}>
            <Mail size={16} className={styles.contactIcon} />
            <span>
              {contactLabel} <strong>{contactValue}</strong>
            </span>
          </div>
        )}

        {/* Author Management Panel */}
        {isOwner && (
          <div className={styles.authorControlPanel}>
            <div className={styles.manageTitle}>{manageTitle}</div>

            <div className={styles.controlsRow}>
              {canSendToReview && onSendToReview && (
                <Button variant="primary" size="small" onClick={onSendToReview}>
                  <Send size={14} style={{ marginRight: '6px' }} />
                  {sendToReviewText}
                </Button>
              )}

              {onLifecycleChange && lifecycleOptions.length > 0 && (
                <div className={styles.phaseWrapper}>
                  <label htmlFor={phaseSelectId} className={styles.phaseLabel}>
                    {phaseLabel}
                  </label>
                  <Select
                    id={phaseSelectId}
                    aria-label={phaseLabel}
                    value={lifecycleState ?? ''}
                    onChange={(val) => onLifecycleChange(val)}
                    options={lifecycleOptions}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={onClose}>
            {closeText}
          </Button>
          {canApply && onOpenApply && (
            <Button variant="primary" onClick={onOpenApply}>
              {applyText}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OpportunityDetailModal;
