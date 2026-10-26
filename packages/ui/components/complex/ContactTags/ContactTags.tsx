import { Mail } from 'lucide-react';
import { ContactIcon } from './ContactIcon';
import type { ContactTagsProps } from './ContactTags.types';
import styles from './ContactTags.module.scss';

export function ContactTags({
  emailLabel,
  alternativeContactLabel,
  email,
  alternativeContact,
}: Readonly<ContactTagsProps>): React.ReactElement {
  const contact = alternativeContact?.trim();

  return (
    <>
      {email && (
        <span className={styles.contactTag} title={emailLabel}>
          <Mail size={12} />
          {email}
        </span>
      )}
      {contact && (
        <span className={styles.contactTag} title={alternativeContactLabel}>
          <ContactIcon value={contact} />
          {contact}
        </span>
      )}
    </>
  );
}
