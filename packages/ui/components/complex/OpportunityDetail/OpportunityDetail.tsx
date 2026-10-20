import React, { useId } from 'react';
import { Mail, Send, Pencil } from 'lucide-react';
import { BackButton } from '../BackButton';
import { Button } from '../../una/Button';
import { Tag } from '../../una/Tag';
import { Select } from '../../una/Select';
import { CheckBox } from '../../una/inputs/CheckBox';
import type { OpportunityDetailProps } from './OpportunityDetail.types';
import styles from './OpportunityDetail.module.scss';

export const OpportunityDetail: React.FC<OpportunityDetailProps> = ({
  onBack,
  backText,
  title,
  paymentTagText,
  statusBadge,
  lifecycleTagText,
  organizerLabel,
  organizerName,
  publishedDateText,
  descriptionTitle,
  descriptionText,
  contactLabel,
  contactValue,
  onSendToReview,
  sendToReviewText,
  onEdit,
  editText,
  moderationComment,
  moderationCommentTitle,
  manageTitle,
  phaseLabel,
  lifecycleState,
  onLifecycleChange,
  onToggleAcceptsApplications,
  acceptsApplicationsLabel,
  applicationsClosedText,
  applyText,
  onOpenApply,
  className,
  acceptsApplications = true,
  paymentTone = 'neutral',
  isOwner = false,
  canEdit = false,
  canSendToReview = false,
  lifecycleOptions = [],
  canApply = false,
}) => {
  const phaseSelectId = useId();

  return (
    <div className={className}>
      <div className={styles.stack}>
        <BackButton label={backText} onClick={onBack} />

        <h3 className={styles.title}>{title}</h3>

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

        {isOwner && moderationComment && (
          <div className={styles.moderationFeedbackBox}>
            {moderationCommentTitle && (
              <div className={styles.moderationFeedbackTitle}>{moderationCommentTitle}</div>
            )}
            <div className={styles.moderationFeedbackText}>{moderationComment}</div>
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
              <div className={styles.actionButtons}>
                {canEdit && onEdit && (
                  <Button variant="secondary" onClick={onEdit}>
                    <Pencil size={14} className={styles.btnIcon} />
                    {editText}
                  </Button>
                )}

                {canSendToReview && onSendToReview && (
                  <Button variant="primary" onClick={onSendToReview}>
                    <Send size={14} className={styles.btnIcon} />
                    {sendToReviewText}
                  </Button>
                )}
              </div>

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

            {onToggleAcceptsApplications && acceptsApplicationsLabel && (
              <div className={styles.acceptsApplicationsRow}>
                <label className={styles.checkboxLabel}>
                  <CheckBox
                    variant="primary"
                    checked={acceptsApplications}
                    onChange={(e) => onToggleAcceptsApplications(e.target.checked)}
                  />
                  <span>{acceptsApplicationsLabel}</span>
                </label>
              </div>
            )}
          </div>
        )}

        {!isOwner && (
          <div className={styles.footer}>
            {canApply && onOpenApply ? (
              <Button variant="primary" onClick={onOpenApply}>
                {applyText}
              </Button>
            ) : acceptsApplications === false && applicationsClosedText ? (
              <Button variant="secondary" disabled>
                {applicationsClosedText}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default OpportunityDetail;
