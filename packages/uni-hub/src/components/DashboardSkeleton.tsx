import React from 'react';
import { Skeleton } from './ui/Skeleton';
import pageStyles from '../views/DashboardPage.module.scss';
import styles from './DashboardSkeleton.module.scss';

export const DashboardSkeleton: React.FC = () => (
  <div className={pageStyles.stack} aria-busy="true" aria-label="Загрузка данных">
    <div className={pageStyles.statGrid}>
      <div className={pageStyles.statCard}>
        <Skeleton height={14} width="40%" className={styles.mb} />
        <Skeleton height={28} width="55%" />
      </div>
      <div className={pageStyles.statCard}>
        <Skeleton height={14} width="40%" className={styles.mb} />
        <Skeleton height={28} width="55%" />
      </div>
    </div>

    <div className={pageStyles.split}>
      <section className={pageStyles.panel}>
        <Skeleton height={20} width="45%" className={styles.mb} />
        <div className={pageStyles.list}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={pageStyles.listItem}>
              <Skeleton height={16} width="70%" className={styles.mb} />
              <Skeleton height={12} width="40%" />
            </div>
          ))}
        </div>
      </section>
      <section className={pageStyles.panel}>
        <Skeleton height={20} width="55%" className={styles.mb} />
        <div className={pageStyles.list}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={pageStyles.listItem}>
              <Skeleton height={16} width="65%" className={styles.mb} />
              <Skeleton height={12} width="35%" />
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);
