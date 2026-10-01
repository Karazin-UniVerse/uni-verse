export type OpportunityCategory = 'all' | 'internships' | 'grants' | 'exchange';

export interface OpportunityItem {
  id: string;
  category: OpportunityCategory;
  title: string;
  organization: string;
  description: string;
  deadline: string;
  tagLabel: string;
  externalUrl: string;
}

type OpportunityDataTuple = readonly [
  id: string,
  category: OpportunityCategory,
  title: string,
  organization: string,
  description: string,
  deadline: string,
  tagLabel: string,
  externalUrl: string,
];

const RAW_OPPORTUNITIES: readonly OpportunityDataTuple[] = [
  [
    'opp-1',
    'internships',
    'EPAM University Program: Junior Full-Stack Engineer',
    'EPAM Systems',
    'Навчальна програма з можливістю працевлаштування для студентів IT-спеціальностей. Практика на реальних проектах із сучасним стеком (React, Node.js, Cloud).',
    '15.11.2026',
    'IT & Стажування',
    'https://training.epam.ua',
  ],
  [
    'opp-2',
    'exchange',
    'Erasmus+ Academic Mobility 2026/2027: Adam Mickiewicz University',
    'Karazin International Office',
    'Семестрове навчання в Польщі для студентів бакалаврату та магістратури. Щомісячна стипендія та повне покриття академічних витрат.',
    '01.12.2026',
    'Академічна мобільність',
    'https://international.karazin.ua',
  ],
  [
    'opp-3',
    'grants',
    'Грантова програма підтримки молодих науковців Каразінського',
    'Наукове товариство ХНУ імені В. Н. Каразіна',
    'Фінансування дослідницьких проектів студентів та аспірантів у галузях природничих та технічних наук. До 50 000 грн на обладнання та досліди.',
    '25.10.2026',
    'Гранти та стипендії',
    'https://science.karazin.ua',
  ],
  [
    'opp-4',
    'internships',
    'SoftServe IT Academy: React & TypeScript Mentorship',
    'SoftServe',
    'Тримісячний інтенсив під керівництвом senior-розробників. Менторство, код-рев’ю та підготовка до позиції Junior Developer.',
    '20.11.2026',
    'IT & Стажування',
    'https://career.softserveinc.com',
  ],
];

export const MOCK_OPPORTUNITIES: OpportunityItem[] = RAW_OPPORTUNITIES.map(
  ([id, category, title, organization, description, deadline, tagLabel, externalUrl]) => ({
    id,
    category,
    title,
    organization,
    description,
    deadline,
    tagLabel,
    externalUrl,
  }),
);
