import React from 'react';
import clsx from 'clsx';
import type { ContactInfoGridProps } from './ContactInfoGrid.types';
import styles from './ContactInfoGrid.module.scss';

export const ContactInfoGrid: React.FC<ContactInfoGridProps> = ({ items, className }) => {
  return (
    <div className={clsx(styles.infoGrid, className)}>
      {items.map((item) => (
        <div key={item.id} className={styles.infoItem}>
          {item.icon && <span className={styles.infoIcon}>{item.icon}</span>}
          <div className={styles.infoText}>
            <strong>{item.label}</strong>
            <span>{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContactInfoGrid;
