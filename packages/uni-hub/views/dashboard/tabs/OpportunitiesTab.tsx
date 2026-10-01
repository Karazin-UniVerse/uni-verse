'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Briefcase,
  GraduationCap,
  Globe,
  Building2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { Tag, Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import {
  type OpportunityCategory,
  type OpportunityItem,
  MOCK_OPPORTUNITIES,
} from './opportunities.mock';
import styles from './OpportunitiesTab.module.scss';

export type { OpportunityCategory, OpportunityItem };
export { MOCK_OPPORTUNITIES };

interface FilterOption {
  category: OpportunityCategory;
  labelKey:
    | 'opportunities.filterAll'
    | 'opportunities.filterInternships'
    | 'opportunities.filterGrants'
    | 'opportunities.filterExchange';
  icon?: React.ComponentType<{ size: number }>;
}

const FILTER_OPTIONS: readonly FilterOption[] = [
  { category: 'all', labelKey: 'opportunities.filterAll' },
  { category: 'internships', labelKey: 'opportunities.filterInternships', icon: Briefcase },
  { category: 'grants', labelKey: 'opportunities.filterGrants', icon: GraduationCap },
  { category: 'exchange', labelKey: 'opportunities.filterExchange', icon: Globe },
];

export const OpportunitiesTab: React.FC = () => {
  const { formatMessage } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory>('all');

  const filteredItems = MOCK_OPPORTUNITIES.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory,
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleRow}>
            <Sparkles size={24} style={{ color: 'var(--accent-active, #1d4ed8)' }} />
            <h2>{formatMessage('opportunities.title')}</h2>
          </div>
          <Tag tone="info">{formatMessage('opportunities.badge')}</Tag>
        </div>

        <p className={styles.subtitle}>{formatMessage('opportunities.subtitle')}</p>

        <div className={styles.filterBar}>
          {FILTER_OPTIONS.map(({ category, labelKey, icon: Icon }) => (
            <button
              key={category}
              type="button"
              className={`${styles.filterBtn} ${selectedCategory === category ? styles.active : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {Icon && <Icon size={14} />}
              {formatMessage(labelKey)}
            </button>
          ))}
        </div>
      </header>

      {filteredItems.length === 0 ? (
        <div className={styles.emptyNotice}>
          <p>{formatMessage('opportunities.empty')}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredItems.map((item) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardMeta}>
                  <span className={styles.categoryTag}>{item.tagLabel}</span>
                  <div className={styles.deadlineContainer}>
                    <Calendar size={13} />
                    <span>
                      {formatMessage('opportunities.deadline')} {item.deadline}
                    </span>
                  </div>
                </div>

                <h3 className={styles.cardTitle}>{item.title}</h3>

                <div className={styles.organization}>
                  <Building2 size={15} />
                  <span>{item.organization}</span>
                </div>

                <p className={styles.cardDescription}>{item.description}</p>
              </div>

              <div className={styles.cardBottom}>
                <div className={styles.actionsRow}>
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Button type="button" variant="primary" size="small">
                      <ExternalLink size={14} style={{ marginRight: 6 }} />
                      {formatMessage('opportunities.apply')}
                    </Button>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
