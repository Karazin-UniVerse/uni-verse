'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Link2, Award, CalendarDays, BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './ConnectMoodleTab.module.scss';

export interface ConnectMoodleTabProps {
  onConnect: () => void;
}

export const ConnectMoodleTab: React.FC<ConnectMoodleTabProps> = ({ onConnect }) => {
  const { formatMessage } = useLanguage();

  return (
    <div className={styles.container}>
      <motion.section
        className={styles.heroCard}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className={styles.heroIconWrapper}>
          <Link2 size={32} aria-hidden />
        </div>

        <h3 className={styles.heroTitle}>{formatMessage('connectMoodle.title')}</h3>

        <p className={styles.heroDescription}>{formatMessage('connectMoodle.subtitle')}</p>

        <div className={styles.heroActions}>
          <Button type="button" variant="primary" size="large" onClick={onConnect}>
            <Link2 size={18} style={{ marginRight: 8 }} />
            {formatMessage('connectMoodle.cta')}
          </Button>

          <Button
            isLink
            href="https://moodle.universemvp.tech"
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            size="large"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={18} style={{ marginRight: 8 }} />
            {formatMessage('connectMoodle.openMoodleLms')}
          </Button>
        </div>
      </motion.section>

      <div className={styles.featuresGrid}>
        <motion.article
          className={styles.featureCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <div className={styles.featureIcon}>
            <Award size={20} aria-hidden />
          </div>
          <h4 className={styles.featureTitle}>
            {formatMessage('connectMoodle.featureGradesTitle')}
          </h4>
          <p className={styles.featureText}>{formatMessage('connectMoodle.featureGradesDesc')}</p>
        </motion.article>

        <motion.article
          className={styles.featureCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <div className={styles.featureIcon}>
            <CalendarDays size={20} aria-hidden />
          </div>
          <h4 className={styles.featureTitle}>
            {formatMessage('connectMoodle.featureDeadlinesTitle')}
          </h4>
          <p className={styles.featureText}>
            {formatMessage('connectMoodle.featureDeadlinesDesc')}
          </p>
        </motion.article>

        <motion.article
          className={styles.featureCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
        >
          <div className={styles.featureIcon}>
            <BookOpen size={20} aria-hidden />
          </div>
          <h4 className={styles.featureTitle}>
            {formatMessage('connectMoodle.featureCoursesTitle')}
          </h4>
          <p className={styles.featureText}>{formatMessage('connectMoodle.featureCoursesDesc')}</p>
        </motion.article>
      </div>
    </div>
  );
};

export default ConnectMoodleTab;
