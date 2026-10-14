import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantColumn } from '../../../storybook/VariantMatrix/VariantColumn';
import { GradeFeedItem } from './GradeFeedItem';
import type { GradeScoreTone } from './GradeFeedItem.types';

const MATRIX_TONES: readonly GradeScoreTone[] = ['success', 'info', 'warning', 'danger', 'default'];

const meta = {
  title: 'Complex/GradeFeedItem',
  component: GradeFeedItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    scoreTone: {
      control: 'select',
      options: ['success', 'info', 'warning', 'danger', 'default'],
      description: 'Visual tone for the score badge',
    },
    title: {
      control: 'text',
      description: 'Assignment or task title',
    },
    courseName: {
      control: 'text',
      description: 'Course or subject name',
    },
    dateText: {
      control: 'text',
      description: 'Formatted date or deadline text',
    },
    score: {
      control: 'text',
      description: 'Score value or status text',
    },
  },
} satisfies Meta<typeof GradeFeedItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  args: {
    title: 'Title',
    courseName: 'Course',
    dateText: 'Sep 12',
    score: '0',
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantColumn
      rows={MATRIX_TONES}
      renderCell={(scoreTone: GradeScoreTone) => (
        <div style={{ width: '360px' }}>
          <GradeFeedItem
            title="Lab 3: Normalization"
            courseName="Databases"
            dateText="Sep 12"
            score="85 / 100"
            scoreTone={scoreTone}
          />
        </div>
      )}
    />
  ),
};
