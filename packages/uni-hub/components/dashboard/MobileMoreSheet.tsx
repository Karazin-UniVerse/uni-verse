'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, LogOut } from 'lucide-react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@uni-hub/components/common/LanguageSwitcher';
import { playClick } from '@uni-hub/utils/soundEffects';
import type { MobileMoreSheetProps } from './MobileMoreSheet.types';
import styles from './MobileMoreSheet.module.scss';

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  activeKey,
  onClose,
  onSelectKey,
  open,
  secondaryItems,
  soundEnabled,
  onLogout,
  onToggleSound,
}) => {
  const { formatMessage } = useLanguage();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className={styles.overlay}>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className={styles.sheet}
            aria-labelledby="more-sheet-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className={styles.dragHandle} aria-hidden="true" />

            <div className={styles.header}>
              <h3 id="more-sheet-title" className={styles.title}>
                {formatMessage('nav.more.sheetTitle')}
              </h3>
              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label={formatMessage('nav.more.close')}
              >
                <X size={18} />
              </button>
            </div>

            {secondaryItems.length > 0 && (
              <section className={styles.section} aria-label={formatMessage('nav.more.sections')}>
                <h4 className={styles.sectionTitle}>{formatMessage('nav.more.sections')}</h4>
                <div className={styles.servicesGrid}>
                  {secondaryItems.map((item) => {
                    const label = formatMessage(item.labelKey);
                    const isActive = activeKey === item.key;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={`${styles.serviceCard} ${isActive ? styles.active : ''}`}
                        onClick={() => {
                          playClick(soundEnabled);
                          onSelectKey(item.key);
                          onClose();
                        }}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className={styles.serviceIcon}>{item.icon}</span>
                        <span className={styles.serviceLabel}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className={styles.section} aria-label={formatMessage('nav.more.preferences')}>
              <h4 className={styles.sectionTitle}>{formatMessage('nav.more.preferences')}</h4>

              <div className={styles.preferencesGrid}>
                <div className={styles.preferenceItem}>
                  <ThemeSwitcher compact showLabel placement="top-start" />
                </div>
                <div className={styles.preferenceItem}>
                  <LanguageSwitcher compact showLabel placement="top-start" />
                </div>
              </div>

              <div className={styles.actionsRow}>
                {onToggleSound && (
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => {
                      playClick(soundEnabled);
                      onToggleSound();
                    }}
                    aria-label={
                      soundEnabled
                        ? formatMessage('header.soundMute')
                        : formatMessage('header.soundUnmute')
                    }
                  >
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span>
                      {soundEnabled
                        ? formatMessage('header.soundMute')
                        : formatMessage('header.soundUnmute')}
                    </span>
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.logout}`}
                    onClick={onLogout}
                  >
                    <LogOut size={16} />
                    <span>{formatMessage('sidebar.logout')}</span>
                  </button>
                )}
              </div>
            </section>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
