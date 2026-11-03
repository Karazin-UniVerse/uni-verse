import { Mail } from 'lucide-react';
import { ContactIcon } from './ContactIcon';
import type { ContactTagsProps } from './ContactTags.types';
import styles from './ContactTags.module.scss';

export function ContactTags({
  emailLabel,
  alternativeContactLabel,
  email,
  alternativeContact,
}: ContactTagsProps): React.ReactElement {
  const contact = alternativeContact?.trim();

  return (
    <>
      {email && (
        <span className={styles.contactTag} title={emailLabel}>
          <Mail size={12} />
          <span className={styles.contactText}>{email}</span>
        </span>
      )}
      {contact && (
        <span className={styles.contactTag} title={alternativeContactLabel}>
          <ContactIcon value={contact} />
          <span className={styles.contactText}>{contact}</span>
        </span>
      )}
    </>
  );
}
