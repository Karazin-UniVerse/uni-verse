'use client';

import React, { useState } from 'react';
import { Building2, Send } from 'lucide-react';
import { Modal, Button, useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { DeanContactInfo } from './DeanContactInfo';
import { DeanTopicChips } from './DeanTopicChips';
import styles from './DeanContactModal.module.scss';

export { DEAN_TOPIC_KEYS } from './DeanTopicChips';

export interface DeanContactModalProps {
  open: boolean;
  onClose: () => void;
  facultyName?: string;
}

export const DeanContactModal: React.FC<DeanContactModalProps> = ({
  open,
  onClose,
  facultyName = 'ННІ Компʼютерних наук та штучного інтелекту',
}) => {
  const toast = useToast();
  const { formatMessage } = useLanguage();

  const defaultTopic = formatMessage('dean.topic.certificate');

  const [selectedTopic, setSelectedTopic] = useState(defaultTopic);
  const [customSubject, setCustomSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setCustomSubject(topic);
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      const ticketNumber = 1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000);
      const successMsg = formatMessage('dean.successMessage', { ticket: ticketNumber });

      toast.success(successMsg);
      setMessage('');
      setCustomSubject('');
      onClose();
    }, 600);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formatMessage('dean.modalTitle')}
      width={560}
      closeLabel={formatMessage('modal.close')}
    >
      <div className={styles.modalContent}>
        <div className={styles.deanHeader}>
          <div className={styles.deanIconWrapper}>
            <Building2 size={26} />
          </div>
          <div className={styles.deanTitleGroup}>
            <h3>{facultyName}</h3>
            <p>{formatMessage('dean.supportSubtitle')}</p>
          </div>
        </div>

        <DeanContactInfo />

        <form onSubmit={handleSubmit} className={styles.modalContent}>
          <DeanTopicChips selectedTopic={selectedTopic} onSelectTopic={handleTopicSelect} />

          <div className={styles.formGroup}>
            <label htmlFor="dean-request-subject">{formatMessage('dean.subjectLabel')}</label>
            <input
              id="dean-request-subject"
              type="text"
              value={customSubject || selectedTopic}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder={formatMessage('dean.subjectPlaceholder')}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="dean-request-message">{formatMessage('dean.messageLabel')}</label>
            <textarea
              id="dean-request-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={formatMessage('dean.messagePlaceholder')}
              rows={3}
              required
            />
          </div>

          <div className={styles.modalFooter}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              {formatMessage('dean.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                formatMessage('dean.sending')
              ) : (
                <span className={styles.submitContent}>
                  <Send size={16} />
                  <span>{formatMessage('dean.submit')}</span>
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
