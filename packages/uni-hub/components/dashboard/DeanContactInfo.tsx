'use client';

import React from 'react';
import { Mail, Phone, Clock } from 'lucide-react';
import { ContactInfoGrid } from '@ui';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export const DeanContactInfo: React.FC = () => {
  const { formatMessage } = useLanguage();

  const items = [
    {
      id: 'email',
      icon: <Mail size={16} />,
      label: formatMessage('dean.email'),
      value: 'dean.cs@karazin.ua',
    },
    {
      id: 'phone',
      icon: <Phone size={16} />,
      label: formatMessage('dean.phone'),
      value: '+38 (057) 707-55-55',
    },
    {
      id: 'schedule',
      icon: <Clock size={16} />,
      label: formatMessage('dean.schedule'),
      value: formatMessage('dean.scheduleValue'),
    },
    {
      id: 'telegram',
      icon: <span>✈️</span>,
      label: formatMessage('dean.telegram'),
      value: '@karazin_edean',
    },
  ];

  return <ContactInfoGrid items={items} />;
};
