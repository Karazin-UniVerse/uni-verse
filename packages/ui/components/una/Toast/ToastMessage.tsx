import React from 'react';
import styles from './Toast.module.scss';

import type { ToastItem } from './Toast.types';

export const ToastMessage: React.FC<Pick<ToastItem, 'kind' | 'text'>> = ({ kind, text }) => (
  <div className={`${styles.toast} ${styles[kind]}`}>{text}</div>
);

export default ToastMessage;
