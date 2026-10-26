import React from 'react';
import { Phone, Send } from 'lucide-react';

const PHONE_PATTERN = /^\+?[\d\s()-]{7,}$/;

export const isPhoneContact = (value: string): boolean => PHONE_PATTERN.test(value.trim());

interface Props {
  value: string;
  size?: number;
}

export const ContactIcon: React.FC<Props> = ({ value, size = 12 }) =>
  isPhoneContact(value) ? (
    <Phone size={size} aria-hidden="true" />
  ) : (
    <Send size={size} aria-hidden="true" />
  );
