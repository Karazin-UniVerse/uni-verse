import React, { useId } from 'react';
import { Mail, Send, Pencil, Users } from 'lucide-react';
import { BackButton } from '../BackButton';
import { Button } from '../../una/Button';
import { Tag } from '../../una/Tag';
import { Select } from '../../una/Select';
import { CheckBox } from '../../una/inputs/CheckBox';
import type { OpportunityDetailProps } from './OpportunityDetail.types';
import styles from './OpportunityDetail.module.scss';

function getCandidateFooterButton({
  isOwner,
  canApply,
  onOpenApply,
  applyText,
  acceptsApplications,
  applicationsClosedText,
}: Pick<
  OpportunityDetailProps,
  | 'isOwner'
  | 'canApply'
  | 'onOpenApply'
  | 'applyText'
  | 'acceptsApplications'
  | 'applicationsClosedText'
>): React.ReactNode {
  if (isOwner) {
    return null;
  }

  if (canApply && onOpenApply) {
    return (
      <Button variant="primary" onClick={onOpenApply}>
        {applyText}
      </Button>
    );
  }

  if (acceptsApplications === false && applicationsClosedText) {
    return (
      <Button variant="secondary" disabled>
        {applicationsClosedText}
      </Button>
    );
  }

  return null;
}

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
  sendToReviewHint,
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
  onOpenApplicants,
  viewApplicantsText,
  className,
  sendToReviewDisabled = false,
  acceptsApplications = true,
  paymentTone = 'neutral',
  isOwner = false,
  canEdit = false,
  canSendToReview = false,
  lifecycleOptions = [],
  canApply = false,
}) => {
  const phaseSelectId = useId();
  const reviewHintId = useId();
  const footerButton = getCandidateFooterButton({
    isOwner,
    canApply,
    onOpenApply,
    applyText,
    acceptsApplications,
    applicationsClosedText,
  });

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
                {onOpenApplicants && viewApplicantsText && (
                  <Button variant="secondary" onClick={onOpenApplicants}>
                    <Users size={14} className={styles.btnIcon} />
                    {viewApplicantsText}
                  </Button>
                )}

                {canEdit && onEdit && (
                  <Button variant="secondary" onClick={onEdit}>
                    <Pencil size={14} className={styles.btnIcon} />
                    {editText}
                  </Button>
                )}

                {canSendToReview && onSendToReview && (
                  <Button
                    variant="primary"
                    onClick={onSendToReview}
                    disabled={sendToReviewDisabled}
                    aria-describedby={sendToReviewHint ? reviewHintId : undefined}
                  >
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

            {sendToReviewHint && (
              <p id={reviewHintId} className={styles.phaseLabel}>
                {sendToReviewHint}
              </p>
            )}

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

        {footerButton && <div className={styles.footer}>{footerButton}</div>}
      </div>
    </div>
  );
};

export default OpportunityDetail;
