'use client';

import React, { useState } from 'react';
import { Building2, Mail, Phone, Clock, Send } from 'lucide-react';
import { Modal, Button as SimpleButton, useToast } from '@una';
import styles from './DeanContactModal.module.scss';

export interface DeanContactModalProps {
  open: boolean;
  onClose: () => void;
  facultyName?: string;
}

export const TEMPLATE_TOPICS = [
  'Довідка про навчання',
  'Академічна довідка / виписка оцінок',
  'Питання щодо сесії та розкладу',
  'Індивідуальний графік навчання',
  'Інше звернення до деканату',
];

export const DeanContactModal: React.FC<DeanContactModalProps> = ({
  open,
  onClose,
  facultyName = 'ННІ Компʼютерних наук та штучного інтелекту',
}) => {
  const toast = useToast();
  const [selectedTopic, setSelectedTopic] = useState(TEMPLATE_TOPICS[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const ticketNumber = 1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000);

      toast.success(
        `Звернення №КВ-${ticketNumber} успішно надіслано до деканату! Відповідь надійде на вашу корпоративну пошту.`,
      );
      setMessage('');
      setCustomSubject('');
      onClose();
    }, 600);
  };

  return (
    <Modal open={open} onClose={onClose} title="Зв'язок з деканатом" width={560}>
      <div className={styles.modalContent}>
        <div className={styles.deanHeader}>
          <div className={styles.deanIconWrapper}>
            <Building2 size={26} />
          </div>
          <div className={styles.deanTitleGroup}>
            <h3>{facultyName}</h3>
            <p>Деканат та служба академічної підтримки студентів</p>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <Mail size={16} />
            <span>
              <strong>Email:</strong> dean.cs@karazin.ua
            </span>
          </div>
          <div className={styles.infoItem}>
            <Phone size={16} />
            <span>
              <strong>Тел:</strong> +38 (057) 707-55-55
            </span>
          </div>
          <div className={styles.infoItem}>
            <Clock size={16} />
            <span>
              <strong>Графік:</strong> Пн–Пт, 09:00 – 17:00
            </span>
          </div>
          <div className={styles.infoItem}>
            <span>
              ✈️ <strong>Telegram:</strong> @karazin_edean
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalContent}>
          <div className={styles.templatesSection}>
            <span className={styles.sectionLabel}>Типові запити (шаблони):</span>
            <div className={styles.chipsList}>
              {TEMPLATE_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  className={`${styles.chipBtn} ${selectedTopic === topic ? styles.chipBtnActive : ''}`}
                  onClick={() => {
                    setSelectedTopic(topic);
                    setCustomSubject(topic);
                  }}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="dean-request-subject">Тема запиту</label>
            <input
              id="dean-request-subject"
              type="text"
              value={customSubject || selectedTopic}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Вкажіть тему запиту"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="dean-request-message">Текст повідомлення або коментар</label>
            <textarea
              id="dean-request-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишіть деталі вашого запиту чи довідки..."
              rows={3}
              required
            />
          </div>

          <div className={styles.modalFooter}>
            <SimpleButton
              type="button"
              variant="secondary"
              size="medium"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Скасувати
            </SimpleButton>
            <SimpleButton type="submit" variant="primary" size="medium" disabled={isSubmitting}>
              {isSubmitting ? (
                'Надсилання...'
              ) : (
                <span className={styles.submitContent}>
                  <Send size={16} />
                  <span>Надіслати звернення</span>
                </span>
              )}
            </SimpleButton>
          </div>
        </form>
      </div>
    </Modal>
  );
};
