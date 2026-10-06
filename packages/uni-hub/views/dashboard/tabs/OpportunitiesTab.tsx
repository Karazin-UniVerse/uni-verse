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
  titleKey: TranslationKey;
  orgKey: TranslationKey;
  descKey: TranslationKey;
  tagKey: TranslationKey;
  deadline: string;
  externalUrl: string;
}

type OpportunityTuple = readonly [
  id: string,
  category: OpportunityCategory,
  titleKey: TranslationKey,
  orgKey: TranslationKey,
  descKey: TranslationKey,
  tagKey: TranslationKey,
  deadline: string,
  externalUrl: string,
];

const RAW_OPPORTUNITIES: readonly OpportunityTuple[] = [
  [
    'opp-1',
    'internships',
    'opportunities.item1Title',
    'opportunities.item1Org',
    'opportunities.item1Desc',
    'opportunities.tagInternships',
    '2026-11-15',
    'https://karazin.ua/',
  ],
  [
    'opp-2',
    'exchange',
    'opportunities.item2Title',
    'opportunities.item2Org',
    'opportunities.item2Desc',
    'opportunities.tagExchange',
    '2026-12-01',
    'https://international.karazin.ua',
  ],
  [
    'opp-3',
    'grants',
    'opportunities.item3Title',
    'opportunities.item3Org',
    'opportunities.item3Desc',
    'opportunities.tagGrants',
    '2026-10-25',
    'https://science.karazin.ua',
  ],
  [
    'opp-4',
    'internships',
    'opportunities.item4Title',
    'opportunities.item4Org',
    'opportunities.item4Desc',
    'opportunities.tagInternships',
    '2026-11-20',
    'https://karazin.ua/',
  ],
];

const OPPORTUNITIES: readonly OpportunityItem[] = RAW_OPPORTUNITIES.map(
  ([id, category, titleKey, orgKey, descKey, tagKey, deadline, externalUrl]) => ({
    id,
    category,
    titleKey,
    orgKey,
    descKey,
    tagKey,
    deadline,
    externalUrl,
  }),
);

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

function parseLocalDate(deadline: string): Date {
  const [year, month, day] = deadline.split('-').map(Number);

  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export const OpportunitiesTab: React.FC = () => {
  const { formatMessage, localeTag } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory>('all');

  const filteredItems = OPPORTUNITIES.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory,
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleRow}>
            <Sparkles size={24} className={styles.sparklesIcon} />
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
            const title = formatMessage(item.titleKey);
            const organization = formatMessage(item.orgKey);
            const formattedDeadline = parseLocalDate(item.deadline).toLocaleDateString(localeTag, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            return (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardMeta}>
                    <span className={styles.categoryTag}>{formatMessage(item.tagKey)}</span>
                    <div className={styles.deadlineContainer}>
                      <Calendar size={13} />
                      <span>
                        {formatMessage('opportunities.deadline')} {formattedDeadline}
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
                      className={styles.applyButton}
                    >
                      <ExternalLink size={14} className={styles.btnIcon} />
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
