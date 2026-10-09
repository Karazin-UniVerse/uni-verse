'use client';

import React from 'react';
import clsx from 'clsx';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@una';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@uni-hub/components/common/LanguageSwitcher';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { LinkMoodleMode } from '@uni-hub/components/auth';
import type { StudentProfile } from '@core/types';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export interface UserDropdownProps {
  activeStudentProfile: StudentProfile;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClose: () => void;
  onLogout: () => void;
  onOpenLinkMoodle?: (mode?: LinkMoodleMode) => void;
  onOpenUnlinkMoodle?: () => void;
  isMoodleIntegrationEnabled?: boolean;
  isMoodleLinked?: boolean;
}

export interface MoodleStatusDetails {
  isLinked: boolean;
  dotColor: string;
  statusKey: TranslationKey;
}

export function getMoodleStatusDetails(isMoodleLinked: boolean): MoodleStatusDetails {
  return {
    isLinked: isMoodleLinked,
    dotColor: isMoodleLinked ? 'var(--success-color, #22c55e)' : 'var(--text-secondary, #94a3b8)',
    statusKey: isMoodleLinked ? 'header.moodleConnected' : 'header.moodleNotConnected',
  };
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  activeStudentProfile,
  soundEnabled,
  onToggleSound,
  onClose,
  onLogout,
  onOpenLinkMoodle,
  onOpenUnlinkMoodle,
  isMoodleIntegrationEnabled = true,
  isMoodleLinked = true,
}) => {
  const { formatMessage } = useLanguage();
  const statusDetails = getMoodleStatusDetails(Boolean(isMoodleLinked));

  return (
    <>
      <div className={styles.userDropdownHeader}>
        {/* intentional: suppressHydrationWarning – student name loaded client-side */}
        <strong suppressHydrationWarning>{activeStudentProfile.fullName}</strong>
        {/* intentional: suppressHydrationWarning – student group loaded client-side */}
        <div className={styles.muted} suppressHydrationWarning>
          {activeStudentProfile.group}
        </div>
      </div>

      {isMoodleIntegrationEnabled && (
        <div className={styles.dropdownSection}>
          <div className={styles.moodleStatusHeader}>
            <span>Moodle LMS</span>
            <span
              className={clsx(
                styles.moodleStatusBadge,
                statusDetails.isLinked ? styles.linked : styles.unlinked,
              )}
            >
              <span
                className={styles.statusDot}
                style={{
                  backgroundColor: statusDetails.dotColor,
                }}
                aria-hidden
              />
              {formatMessage(statusDetails.statusKey)}
            </span>
          </div>

          {isMoodleLinked ? (
            <div className={styles.moodleDropdownActions}>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => {
                  onClose();
                  onOpenLinkMoodle?.(LinkMoodleMode.CHANGE);
                }}
              >
                {formatMessage('header.moodleChange')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => {
                  onClose();
                  onOpenUnlinkMoodle?.();
                }}
                style={{ color: 'var(--error-color)' }}
              >
                {formatMessage('header.moodleDisconnect')}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={() => {
                onClose();
                onOpenLinkMoodle?.(LinkMoodleMode.CONNECT);
              }}
              style={{ width: '100%' }}
            >
              {formatMessage('header.moodleConnect')}
            </Button>
          )}
        </div>
      )}

      <div className={styles.userDropdownBody}>
        <div className={styles.mobileOnlyItem} style={{ marginBottom: 6 }}>
          <LanguageSwitcher compact={false} />
        </div>

        <div className={styles.mobileOnlyItem}>
          <ThemeSwitcher compact={false} showLabel={true} />
        </div>

        <div className={styles.mobileOnlyItem}>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={onToggleSound}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            {soundEnabled ? (
              <Volume2 size={16} style={{ marginRight: 8 }} />
            ) : (
              <VolumeX size={16} style={{ marginRight: 8 }} />
            )}
            {soundEnabled ? formatMessage('header.soundMute') : formatMessage('header.soundUnmute')}
          </Button>
        </div>

        {isMoodleIntegrationEnabled && (
          <div className={styles.mobileOnlyItem} style={{ marginBottom: 8 }}>
            <a
              href="https://moodle.universemvp.tech"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.moodleStatusLink}
            >
              <span className={styles.statusDot} aria-hidden />
              <span>Moodle LMS</span>
            </a>
          </div>
        )}

        <div className={styles.mobileOnlyItem}>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={onLogout}
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              color: 'var(--text-primary)',
            }}
          >
            {formatMessage('sidebar.logout')}
          </Button>
        </div>
      </div>
    </>
  );
};
