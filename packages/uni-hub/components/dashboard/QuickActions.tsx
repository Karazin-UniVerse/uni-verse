'use client';

import React, { useMemo, useState } from 'react';
import { Globe, FileText, Calendar, Building2, Sparkles } from 'lucide-react';
import { ActionCard } from '@ui';
import type { Assignment } from '@uni-hub/types';
import type { NavKey } from '@uni-hub/views/dashboard/constants';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useFeatures } from '@uni-hub/features';
import { DeanContactModal } from './DeanContactModal';
import { calculatePendingAssignmentsCount } from './helpers';
import styles from './QuickActions.module.scss';

export interface QuickActionsProps {
  assignments: Assignment[];
  onNavigate: (tab: NavKey) => void;
}

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://moodle.universemvp.tech';

export const QuickActions: React.FC<QuickActionsProps> = ({ assignments, onNavigate }) => {
  const { formatMessage } = useLanguage();
  const { isMoodleIntegrationEnabled, isEDeanEnabled, isOpportunitiesPlatformEnabled } =
    useFeatures();
  const [isDeanModalOpen, setIsDeanModalOpen] = useState(false);
  const pendingCount = useMemo(() => calculatePendingAssignmentsCount(assignments), [assignments]);

  return (
    <>
      <section
        className={styles.quickActionsContainer}
        aria-label={formatMessage('quickActions.ariaLabel')}
      >
        <div className={styles.quickActionsHeader}>
          <h3>{formatMessage('quickActions.title')}</h3>
        </div>

        <div className={styles.actionsGrid}>
          {isMoodleIntegrationEnabled && (
            <ActionCard
              href={MOODLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              icon={<Globe size={22} />}
              iconTone="moodle"
              title={formatMessage('quickActions.moodle')}
              badge={formatMessage('quickActions.moodleBadge')}
              badgeTone="info"
              description={formatMessage('quickActions.moodleDescription')}
              cardTitle={formatMessage('quickActions.moodleTitle')}
              isExternal
            />
          )}

          {isMoodleIntegrationEnabled && (
            <ActionCard
              icon={<FileText size={22} />}
              iconTone="assignments"
              title={formatMessage('quickActions.myAssignments')}
              badge={pendingCount > 0 ? pendingCount : undefined}
              badgeTone="alert"
              description={
                pendingCount > 0
                  ? formatMessage('quickActions.pendingCount', { count: pendingCount })
                  : formatMessage('quickActions.allDone')
              }
              cardTitle={formatMessage('quickActions.assignmentsTitle')}
              onClick={() => onNavigate('assignments')}
            />
          )}

          {isEDeanEnabled && (
            <ActionCard
              icon={<Calendar size={22} />}
              iconTone="schedule"
              title={formatMessage('quickActions.schedule')}
              description={formatMessage('quickActions.scheduleDescription')}
              cardTitle={formatMessage('quickActions.scheduleTitle')}
              onClick={() => onNavigate('schedule')}
            />
          )}

          {isEDeanEnabled && (
            <ActionCard
              icon={<Building2 size={22} />}
              iconTone="dean"
              title={formatMessage('quickActions.dean')}
              description={formatMessage('quickActions.deanDescription')}
              cardTitle={formatMessage('quickActions.deanTitle')}
              onClick={() => setIsDeanModalOpen(true)}
            />
          )}

          {isOpportunitiesPlatformEnabled && (
            <ActionCard
              icon={<Sparkles size={22} />}
              iconTone="opportunities"
              title={formatMessage('quickActions.opportunities')}
              badge={formatMessage('quickActions.newBadge')}
              badgeTone="info"
              description={formatMessage('quickActions.opportunitiesDescription')}
              cardTitle={formatMessage('quickActions.opportunitiesTitle')}
              onClick={() => onNavigate('opportunities')}
            />
          )}
        </div>
      </section>

      <DeanContactModal open={isDeanModalOpen} onClose={() => setIsDeanModalOpen(false)} />
    </>
  );
};
