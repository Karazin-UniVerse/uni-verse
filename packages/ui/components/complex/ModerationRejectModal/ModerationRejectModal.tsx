import React, { useId } from 'react';
import { Modal } from '../../una/Modal';
import { Button } from '../../una/Button';
import type { ModerationRejectModalProps } from './ModerationRejectModal.types';
import styles from './ModerationRejectModal.module.scss';

export const ModerationRejectModal: React.FC<ModerationRejectModalProps> = ({
  open,
  onClose,
  title,
  comment,
  onCommentChange,
  commentLabel,
  placeholder,
  cancelText,
  reviseText,
  rejectText,
  onRevise,
  onReject,
  className,
  isSubmitting = false,
}) => {
  const commentId = useId();

  return (
    <Modal open={open} onClose={onClose} title={title} width={540} className={className}>
      <div className={styles.modalStack}>
        <div className={styles.fieldGroup}>
          <label htmlFor={commentId} className={styles.fieldLabel}>
            {commentLabel}
          </label>
          <textarea
            id={commentId}
            rows={4}
            className={styles.textarea}
            placeholder={placeholder}
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {cancelText}
          </Button>
          <Button
            variant="primary"
            className={styles.reviseBtn}
            disabled={!comment.trim() || isSubmitting}
            onClick={onRevise}
          >
            {reviseText}
          </Button>
          <Button
            variant="primary"
            className={styles.rejectBtn}
            disabled={!comment.trim() || isSubmitting}
            onClick={onReject}
          >
            {rejectText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModerationRejectModal;
