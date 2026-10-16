'use client';

import React from 'react';
import { Mail, Phone, Clock } from 'lucide-react';
import { ContactInfoGrid } from '@ui';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export interface DeanContactInfoProps {
  className?: string;
  schedule?: string;
  email?: string;
  phone?: string;
  telegram?: string;
}

export const DeanContactInfo: React.FC<DeanContactInfoProps> = ({
  className,
  schedule,
  email = 'dean.cs@karazin.ua',
  phone = '+38 (057) 707-55-55',
  telegram = '@karazin_edean',
}) => {
  const { formatMessage } = useLanguage();

  const items = [
    {
      id: 'email',
      icon: <Mail size={16} />,
      label: formatMessage('dean.email'),
      value: <a href={`mailto:${email}`}>{email}</a>,
    },
    {
      id: 'phone',
      icon: <Phone size={16} />,
      label: formatMessage('dean.phone'),
      value: <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a>,
    },
    {
      id: 'schedule',
      icon: <Clock size={16} />,
      label: formatMessage('dean.schedule'),
      value: schedule ?? formatMessage('dean.scheduleValue'),
    },
    {
      id: 'telegram',
      icon: <span>✈️</span>,
      label: formatMessage('dean.telegram'),
      value: (
        <a
          href={`https://t.me/${telegram.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {telegram}
        </a>
      ),
    },
  ];

  return <ContactInfoGrid className={className} items={items} />;
};
