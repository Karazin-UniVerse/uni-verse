import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../una/Button';
import type { BackButtonProps } from './BackButton.types';
import styles from './BackButton.module.scss';

export const BackButton: React.FC<BackButtonProps> = ({ label, onClick }) => (
  <Button
    type="button"
    variant="secondary"
    isTransparent
    onClick={onClick}
    className={styles.backButton}
  >
    <ArrowLeft size={16} className={styles.icon} />
    {label}
  </Button>
);

export default BackButton;
