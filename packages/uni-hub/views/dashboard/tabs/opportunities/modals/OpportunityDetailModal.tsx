'use client';

import React from 'react';
import { Button, Tag, Select, Modal } from '@una';
import { Mail, Send } from 'lucide-react';
import type { Opportunity, OpportunityLifecycle } from '@uni-hub/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { OpportunityStatusBadge } from '../OpportunityStatusBadge';
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
  const { formatMessage, language } = useLanguage();

  if (!opportunity) return null;

  const isOwner = userId === opportunity.ownerId;
  const paymentTagText =
    opportunity.paymentType === 'PAID'
      ? formatMessage('opportunities.detailModal.paidWithDetails', {
          details:
            opportunity.paymentDetails || formatMessage('opportunities.detailModal.paidProvided'),
        })
      : formatMessage('opportunities.detailModal.unpaid');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={opportunity.title ?? formatMessage('opportunities.detailModal.defaultTitle')}
      width={680}
    >
      <div className={styles.modalStack}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Tag tone={opportunity.paymentType === 'PAID' ? 'success' : 'neutral'}>
            {paymentTagText}
          </Tag>
          <OpportunityStatusBadge status={opportunity.status} />
          {opportunity.lifecycleState && (
            <Tag tone="info">
              {formatMessage('opportunities.detailModal.lifecycleState', {
                state: opportunity.lifecycleState,
              })}
            </Tag>
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
            {formatMessage('opportunities.detailModal.organizer')}{' '}
            <strong>
              {opportunity.owner?.name ||
                opportunity.owner?.email ||
                formatMessage('opportunities.detailModal.defaultOrganizer')}
            </strong>
          </span>
          <span>•</span>
          <span>
            {formatMessage('opportunities.detailModal.publishedOn', {
              date: new Date(opportunity.createdAt).toLocaleDateString(
                language === 'uk' ? 'uk-UA' : 'en-US',
              ),
            })}
          </span>
        </div>

        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>
            {formatMessage('opportunities.detailModal.descTitle')}
          </div>
          <div className={styles.detailSectionText}>{opportunity.description}</div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'var(--font-sm)',
          }}
        >
          <Mail size={16} style={{ color: 'var(--accent-primary)' }} />
          <span>
            {formatMessage('opportunities.detailModal.contacts')}{' '}
            <strong>{opportunity.ownerContactInfo}</strong>
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
              {formatMessage('opportunities.detailModal.manageTitle')}
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
              {(opportunity.status === 'DRAFT' || opportunity.status === 'REQUIRES_CHANGES') && (
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => onSendToReview(opportunity.id)}
                >
                  <Send size={14} style={{ marginRight: '6px' }} />
                  {formatMessage('opportunities.detailModal.sendToReview')}
                </Button>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginLeft: 'auto',
                }}
              >
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  {formatMessage('opportunities.detailModal.phaseLabel')}
                </span>
                <Select
                  value={opportunity.lifecycleState}
                  onChange={(state) =>
                    onLifecycleChange(opportunity.id, state as OpportunityLifecycle)
                  }
                  options={[
                    {
                      value: 'START',
                      label: formatMessage('opportunities.detailModal.phaseStart'),
                    },
                    {
                      value: 'ACTIVE',
                      label: formatMessage('opportunities.detailModal.phaseActive'),
                    },
                    {
                      value: 'PAUSED',
                      label: formatMessage('opportunities.detailModal.phasePaused'),
                    },
                    {
                      value: 'COMPLETED',
                      label: formatMessage('opportunities.detailModal.phaseCompleted'),
                    },
                    {
                      value: 'CANCELLED',
                      label: formatMessage('opportunities.detailModal.phaseCancelled'),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={onClose}>
            {formatMessage('opportunities.detailModal.close')}
          </Button>
          {!isOwner && opportunity.status === 'PUBLISHED' && (
            <Button variant="primary" onClick={onOpenApply}>
              {formatMessage('opportunities.detailModal.apply')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
