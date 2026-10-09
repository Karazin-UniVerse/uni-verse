'use client';

import React from 'react';
import { ApplyOpportunityModal as ApplyOpportunityModalUI } from '@universe/ui';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export interface ApplyOpportunityModalProps {
  open: boolean;
  onClose: () => void;
  opportunityTitle?: string;
  motivation: string;
  onMotivationChange: (val: string) => void;
  contactInfo: string;
  onContactInfoChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export const ApplyOpportunityModal: React.FC<ApplyOpportunityModalProps> = ({
  open,
  onClose,
  opportunityTitle,
  motivation,
  onMotivationChange,
  contactInfo,
  onContactInfoChange,
  onSubmit,
  submitting,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <ApplyOpportunityModalUI
      open={open}
      onClose={onClose}
      title={formatMessage('opportunities.applyModal.title', {
        title: opportunityTitle || '',
      })}
      motivation={motivation}
      onMotivationChange={onMotivationChange}
      motivationLabel={formatMessage('opportunities.applyModal.motivationLabel')}
      motivationPlaceholder={formatMessage('opportunities.applyModal.motivationPlaceholder')}
      contactInfo={contactInfo}
      onContactInfoChange={onContactInfoChange}
      contactLabel={formatMessage('opportunities.applyModal.contactLabel')}
      contactPlaceholder={formatMessage('opportunities.applyModal.contactPlaceholder')}
      cancelText={formatMessage('opportunities.applyModal.cancel')}
      submitText={formatMessage('opportunities.applyModal.submit')}
      submittingText={formatMessage('opportunities.applyModal.submitting')}
      onSubmit={onSubmit}
      submitting={submitting}
    />
  );
};
