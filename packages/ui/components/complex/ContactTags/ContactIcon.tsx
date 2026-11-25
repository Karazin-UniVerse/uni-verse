import React from 'react';
import { Mail, Phone, Send } from 'lucide-react';
import { isEmailContact } from '@core/utils/contacts';

const PHONE_PATTERN = /^\+?[\d\s()-]{7,}$/;

export const isPhoneContact = (value: string): boolean => PHONE_PATTERN.test(value.trim());

interface ContactIconProps {
  readonly value: string;
  readonly size?: number;
}

function getContactIcon(value: string, size: number): React.ReactElement {
  if (isEmailContact(value)) {
    return <Mail size={size} aria-hidden="true" />;
  }

  if (isPhoneContact(value)) {
    return <Phone size={size} aria-hidden="true" />;
  }

  return <Send size={size} aria-hidden="true" />;
}

export const ContactIcon: React.FC<ContactIconProps> = ({ value, size = 12 }) =>
  getContactIcon(value, size);
