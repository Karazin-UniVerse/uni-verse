import React from 'react';
import { FolderOpen } from 'lucide-react';
import styles from './Empty.module.scss';

import type { EmptyProps } from './Empty.types';

export const Empty: React.FC<EmptyProps> = ({ description = 'Нет данных' }) => (
  <div className={styles.empty}>
    <FolderOpen size={48} className={styles.icon} aria-hidden />
    <p>{description}</p>
  </div>
);

export default Empty;
