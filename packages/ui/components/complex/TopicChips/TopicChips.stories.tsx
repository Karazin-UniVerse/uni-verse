import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantRow } from '../../../storybook/VariantMatrix/VariantRow';
import { TopicChips } from './TopicChips';
import type { TopicChipsProps } from './TopicChips.types';
import { noop } from '@core/utils/fn';

type MatrixLabel = 'with label' | 'without label';

const SAMPLE_CHIPS = [
  { id: 'cert', label: 'Enrollment Certificate' },
  { id: 'transcript', label: 'Academic Transcript' },
  { id: 'session', label: 'Exam Session Questions' },
  { id: 'individual', label: 'Individual Study Plan' },
  { id: 'other', label: 'Other Inquiries' },
];
const MATRIX_LABELS: Record<MatrixLabel, Pick<TopicChipsProps, 'label' | 'ariaLabel'>> = {
  'with label': { label: 'Select inquiry topic' },
  'without label': { ariaLabel: 'Inquiry topics' },
};

function MatrixTopicChips(props: Pick<TopicChipsProps, 'label' | 'ariaLabel'>) {
  const [selectedId, setSelectedId] = useState(SAMPLE_CHIPS[0].id);

  return (
    <TopicChips
      {...props}
      options={SAMPLE_CHIPS}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  );
}

const meta = {
  title: 'Complex/TopicChips',
  component: TopicChips,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Section label or header text',
    },
  },
} satisfies Meta<typeof TopicChips>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  args: {
    options: [],
    onSelect: noop,
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantRow
      columns={Object.keys(MATRIX_LABELS) as MatrixLabel[]}
      renderCell={(label: MatrixLabel) => (
        <div style={{ width: '360px' }}>
          <MatrixTopicChips {...MATRIX_LABELS[label]} />
        </div>
      )}
    />
  ),
};
