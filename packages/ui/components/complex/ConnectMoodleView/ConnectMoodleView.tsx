import React from 'react';
import clsx from 'clsx';
import { Link2, ExternalLink } from 'lucide-react';
import { Button } from '../../una';
import styles from './ConnectMoodleView.module.scss';

export interface ConnectMoodleFeatureItem {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
}

export interface ConnectMoodleViewProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  connectCtaLabel: React.ReactNode;
  openMoodleLabel: React.ReactNode;
  moodleUrl?: string;
  onConnect: () => void;
  features?: ConnectMoodleFeatureItem[];
  className?: string;
}

export const ConnectMoodleView: React.FC<ConnectMoodleViewProps> = ({
  title,
  subtitle,
  connectCtaLabel,
  openMoodleLabel,
  onConnect,
  className,
  moodleUrl = 'https://moodle.universemvp.tech',
  features = [],
}) => {
  return (
    <div className={clsx(styles.container, className)}>
      <section className={styles.heroCard}>
        <div className={styles.heroIconWrapper}>
          <Link2 size={32} aria-hidden />
        </div>

        <h3 className={styles.heroTitle}>{title}</h3>

        <p className={styles.heroDescription}>{subtitle}</p>

        <div className={styles.heroActions}>
          <Button type="button" variant="primary" size="large" onClick={onConnect}>
            <Link2 size={18} style={{ marginRight: 8 }} />
            {connectCtaLabel}
          </Button>

          <Button
            isLink
            href={moodleUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            size="large"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={18} style={{ marginRight: 8 }} />
            {openMoodleLabel}
          </Button>
        </div>
      </section>

      {features.length > 0 && (
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <article key={index} className={styles.featureCard}>
              {feature.icon && <div className={styles.featureIcon}>{feature.icon}</div>}
              <h4 className={styles.featureTitle}>{feature.title}</h4>
              <p className={styles.featureText}>{feature.description}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConnectMoodleView;
