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
import styles from './OpportunitiesTab.module.scss';

type OpportunityCategory = 'all' | 'internships' | 'grants' | 'exchange';

interface OpportunityItem {
  id: string;
  category: OpportunityCategory;
  title: string;
  organization: string;
  description: string;
  deadline: string;
  tagLabel: string;
  externalUrl: string;
}

const OPPORTUNITIES: readonly OpportunityItem[] = [
  {
    id: 'opp-1',
    category: 'internships',
    title: 'EPAM University Program: Junior Full-Stack Engineer',
    organization: 'EPAM Systems',
    description:
      'Навчальна програма з можливістю працевлаштування для студентів IT-спеціальностей. Практика на реальних проектах із сучасним стеком (React, Node.js, Cloud).',
    deadline: '15.11.2026',
    tagLabel: 'IT & Стажування',
    externalUrl: 'https://training.epam.ua',
  },
  {
    id: 'opp-2',
    category: 'exchange',
    title: 'Erasmus+ Academic Mobility 2026/2027: Adam Mickiewicz University',
    organization: 'Karazin International Office',
    description:
      'Семестрове навчання в Польщі для студентів бакалаврату та магістратури. Щомісячна стипендія та повне покриття академічних витрат.',
    deadline: '01.12.2026',
    tagLabel: 'Академічна мобільність',
    externalUrl: 'https://international.karazin.ua',
  },
  {
    id: 'opp-3',
    category: 'grants',
    title: 'Грантова програма підтримки молодих науковців Каразінського',
    organization: 'Наукове товариство ХНУ імені В. Н. Каразіна',
    description:
      'Фінансування дослідницьких проектів студентів та аспірантів у галузях природничих та технічних наук. До 50 000 грн на обладнання та досліди.',
    deadline: '25.10.2026',
    tagLabel: 'Гранти та стипендії',
    externalUrl: 'https://science.karazin.ua',
  },
  {
    id: 'opp-4',
    category: 'internships',
    title: 'SoftServe IT Academy: React & TypeScript Mentorship',
    organization: 'SoftServe',
    description:
      'Тримісячний інтенсив під керівництвом senior-розробників. Менторство, код-рев’ю та підготовка до позиції Junior Developer.',
    deadline: '20.11.2026',
    tagLabel: 'IT & Стажування',
    externalUrl: 'https://career.softserveinc.com',
  },
];

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
          ))}
        </div>
      )}
    </div>
  );
};
