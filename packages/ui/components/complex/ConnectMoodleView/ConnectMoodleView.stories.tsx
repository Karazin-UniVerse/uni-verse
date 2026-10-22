import type { Meta, StoryObj } from '@storybook/react-vite';
import { Award, CalendarDays, BookOpen } from 'lucide-react';
import { noop } from '@core/utils/fn';

import { VariantRow } from '../../../storybook/VariantMatrix/VariantRow';
import { ConnectMoodleView } from './ConnectMoodleView';
import type { ConnectMoodleFeatureItem } from './ConnectMoodleView';

type MatrixFeatures = 'with features' | 'without features';

const FEATURES: ConnectMoodleFeatureItem[] = [
  {
    id: 'grades',
    icon: <Award size={20} />,
    title: 'Синхронізація оцінок',
    description: 'Ваша заліковка завжди під рукою з автоматичним розрахунком ECTS.',
  },
  {
    id: 'deadlines',
    icon: <CalendarDays size={20} />,
    title: 'Дедлайни та завдання',
    description: 'Слідкуйте за дедлайнами лабораторних та практичних робіт.',
  },
  {
    id: 'courses',
    icon: <BookOpen size={20} />,
    title: 'Матеріали та курси',
    description: 'Швидкий доступ до навчальних матеріалів кожного курсу.',
  },
];
const MATRIX_FEATURES: Record<MatrixFeatures, ConnectMoodleFeatureItem[]> = {
  'with features': FEATURES,
  'without features': [],
};

const meta = {
  title: 'Complex/ConnectMoodleView',
  component: ConnectMoodleView,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    connectCtaLabel: { control: 'text' },
    openMoodleLabel: { control: 'text' },
    moodleUrl: { control: 'text' },
  },
} satisfies Meta<typeof ConnectMoodleView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  args: {
    title: 'Title',
    subtitle: 'Subtitle',
    connectCtaLabel: 'Connect',
    openMoodleLabel: 'Open',
    onConnect: noop,
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantRow
      columns={Object.keys(MATRIX_FEATURES) as MatrixFeatures[]}
      renderCell={(features: MatrixFeatures) => (
        <div style={{ width: '520px' }}>
          <ConnectMoodleView
            title="Підключення акаунту Moodle LMS"
            subtitle="Отримайте повну синхронізацію навчального процесу в один клік."
            connectCtaLabel="Підключити Moodle зараз"
            openMoodleLabel="Відкрити Moodle LMS"
            onConnect={noop}
            features={MATRIX_FEATURES[features]}
          />
        </div>
      )}
    />
  ),
};
