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
import type { TranslationKey } from '@uni-hub/i18n/translations';
import styles from './OpportunitiesTab.module.scss';

type OpportunityCategory = 'all' | 'internships' | 'grants' | 'exchange';

interface OpportunityItem {
  id: string;
  category: OpportunityCategory;
  titleKey?: TranslationKey;
  title?: string;
  orgKey?: TranslationKey;
  organization?: string;
  descKey: TranslationKey;
  tagKey: TranslationKey;
  deadline: string;
  externalUrl: string;
}

const OPPORTUNITIES: readonly OpportunityItem[] = [
  {
    id: 'opp-1',
    category: 'internships',
    title: 'EPAM University Program: Junior Full-Stack Engineer',
    organization: 'EPAM Systems',
    descKey: 'opportunities.item1Desc',
    tagKey: 'opportunities.tagInternships',
    deadline: '15.11.2026',
    externalUrl: 'https://training.epam.ua',
  },
  {
    id: 'opp-2',
    category: 'exchange',
    title: 'Erasmus+ Academic Mobility 2026/2027: Adam Mickiewicz University',
    organization: 'Karazin International Office',
    descKey: 'opportunities.item2Desc',
    tagKey: 'opportunities.tagExchange',
    deadline: '01.12.2026',
    externalUrl: 'https://international.karazin.ua',
  },
  {
    id: 'opp-3',
    category: 'grants',
    titleKey: 'opportunities.item3Title',
    orgKey: 'opportunities.item3Org',
    descKey: 'opportunities.item3Desc',
    tagKey: 'opportunities.tagGrants',
    deadline: '25.10.2026',
    externalUrl: 'https://science.karazin.ua',
  },
  {
    id: 'opp-4',
    category: 'internships',
    title: 'SoftServe IT Academy: React & TypeScript Mentorship',
    organization: 'SoftServe',
    descKey: 'opportunities.item4Desc',
    tagKey: 'opportunities.tagInternships',
    deadline: '20.11.2026',
    externalUrl: 'https://career.softserveinc.com',
  },
];

interface FilterOption {
  category: OpportunityCategory;
  labelKey: TranslationKey;
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

  const filteredItems = OPPORTUNITIES.filter(
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
              aria-pressed={selectedCategory === category}
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
          {filteredItems.map((item) => {
            const title = item.titleKey ? formatMessage(item.titleKey) : item.title;
            const organization = item.orgKey ? formatMessage(item.orgKey) : item.organization;

            return (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardMeta}>
                    <span className={styles.categoryTag}>{formatMessage(item.tagKey)}</span>
                    <div className={styles.deadlineContainer}>
                      <Calendar size={13} />
                      <span>
                        {formatMessage('opportunities.deadline')} {item.deadline}
                      </span>
                    </div>
                  </div>

                  <h3 className={styles.cardTitle}>{title}</h3>

                  <div className={styles.organization}>
                    <Building2 size={15} />
                    <span>{organization}</span>
                  </div>

                  <p className={styles.cardDescription}>{formatMessage(item.descKey)}</p>
                </div>

                <div className={styles.cardBottom}>
                  <div className={styles.actionsRow}>
                    <Button
                      isLink
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="primary"
                      size="small"
                      style={{ textDecoration: 'none' }}
                    >
                      <ExternalLink size={14} style={{ marginRight: 6 }} />
                      {formatMessage('opportunities.apply')}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
