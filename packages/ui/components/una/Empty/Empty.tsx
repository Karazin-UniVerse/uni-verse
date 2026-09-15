import React from 'react';
import { FolderOpen } from 'lucide-react';
import styles from './Empty.module.scss';

import type { EmptyProps } from './Empty.types';

export const Empty: React.FC<EmptyProps> = ({ icon, description = 'Нет данных' }) => (
  <div className={styles.empty}>
    {icon ?? <FolderOpen size={48} className={styles.icon} aria-hidden />}
    <p>{description}</p>
  </div>
);

export default Empty;
