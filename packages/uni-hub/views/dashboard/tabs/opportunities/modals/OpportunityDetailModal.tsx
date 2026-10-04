'use client';

import React from 'react';
import { Button, Tag, Select, Modal } from '@una';
import { Mail, Send } from 'lucide-react';
import type { Opportunity, OpportunityLifecycle } from '@uni-hub/types';
import { getStatusBadge } from '../badges';
import styles from '../../OpportunitiesTab.module.scss';

export interface OpportunityDetailModalProps {
  open: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  userId: string | null;
  onSendToReview: (id: string) => void;
  onLifecycleChange: (id: string, state: OpportunityLifecycle) => void;
  onOpenApply: () => void;
}

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  open,
  onClose,
  opportunity,
  userId,
  onSendToReview,
  onLifecycleChange,
  onOpenApply,
}) => {
  if (!opportunity) return null;

  const isOwner = userId === opportunity.ownerId;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={opportunity.title ?? 'Деталі можливості'}
      width={680}
    >
      <div className={styles.modalStack}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Tag tone={opportunity.paymentType === 'PAID' ? 'success' : 'neutral'}>
            {opportunity.paymentType === 'PAID'
              ? `Оплата: ${opportunity.paymentDetails || 'Передбачена'}`
              : 'Без оплати (Практика / Досвід)'}
          </Tag>
          {getStatusBadge(opportunity.status)}
          {opportunity.lifecycleState && (
            <Tag tone="info">Стан: {opportunity.lifecycleState}</Tag>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '16px',
            fontSize: 'var(--font-xs)',
            color: 'var(--text-secondary)',
            padding: '6px 0',
            borderBottom: '1px solid var(--card-border)',
          }}
        >
          <span>
            Організатор: <strong>{opportunity.owner?.name || opportunity.owner?.email || 'Каразінський університет'}</strong>
          </span>
          <span>•</span>
          <span>Опубліковано: {new Date(opportunity.createdAt).toLocaleDateString('uk-UA')}</span>
        </div>

        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>Опис проекту та вимоги</div>
          <div className={styles.detailSectionText}>{opportunity.description}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-sm)' }}>
          <Mail size={16} style={{ color: 'var(--accent-primary)' }} />
          <span>
            Контакти для звʼязку: <strong>{opportunity.ownerContactInfo}</strong>
          </span>
        </div>

        {/* Author Management Box */}
        {isOwner && (
          <div className={styles.authorControlPanel}>
            <div
              style={{
                fontSize: 'var(--font-xs)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--accent-primary)',
              }}
            >
              Керування вашою можливістю
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              {(opportunity.status === 'DRAFT' ||
                opportunity.status === 'REQUIRES_CHANGES') && (
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => onSendToReview(opportunity.id)}
                >
                  <Send size={14} style={{ marginRight: '6px' }} />
                  Надіслати на модерацію
                </Button>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  Фаза:
                </span>
                <Select
                  value={opportunity.lifecycleState}
                  onChange={(state) =>
                    onLifecycleChange(opportunity.id, state as OpportunityLifecycle)
                  }
                  options={[
                    { value: 'START', label: 'Старт' },
                    { value: 'ACTIVE', label: 'Активна фаза' },
                    { value: 'PAUSED', label: 'На паузі' },
                    { value: 'COMPLETED', label: 'Завершено' },
                    { value: 'CANCELLED', label: 'Скасовано' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={onClose}>
            Закрити
          </Button>
          {!isOwner && opportunity.status === 'PUBLISHED' && (
            <Button variant="primary" onClick={onOpenApply}>
              Відгукнутися на можливість
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
