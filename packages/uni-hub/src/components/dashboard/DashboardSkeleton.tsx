import React from 'react';
import { Skeleton } from '@una';
import pageStyles from '@uni-hub/views/DashboardPage.module.scss';
import styles from './DashboardSkeleton.module.scss';

export const DashboardSkeleton: React.FC = () => (
  <div className={pageStyles.stack} aria-busy="true" aria-label="Загрузка данных">
    <section className={pageStyles.studentCard}>
      <div className={pageStyles.studentCardTop}>
        <div className={pageStyles.studentIdentity}>
          <Skeleton height={48} width={48} borderRadius="50%" />
          <div className={pageStyles.studentMainInfo}>
            <Skeleton height={20} width={200} className={styles.mb} />
            <Skeleton height={14} width={150} />
          </div>
        </div>
        <div className={pageStyles.studentTags}>
          <Skeleton height={24} width={80} />
          <Skeleton height={24} width={100} />
        </div>
      </div>
      <div className={pageStyles.studentGrid}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className={pageStyles.studentField}>
            <Skeleton height={12} width={100} className={styles.mb} />
            <Skeleton height={16} width={140} />
          </div>
        ))}
      </div>
    </section>

    <div className={pageStyles.overviewHero}>
      <Skeleton height={28} width={300} />
    </div>

    <div className={pageStyles.statGrid}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={pageStyles.statCard}>
          <Skeleton height={14} width="40%" className={styles.mb} />
          <Skeleton height={28} width="55%" />
        </div>
      ))}
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
