import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BREAKPOINTS } from '@universe/core/constants/breakpoints';

import { TopicChips } from './TopicChips';

const sampleChips = [
  { id: 'cert', label: 'Enrollment Certificate' },
  { id: 'transcript', label: 'Academic Transcript' },
  { id: 'session', label: 'Exam Session Questions' },
  { id: 'individual', label: 'Individual Study Plan' },
  { id: 'other', label: 'Other Inquiries' },
];

const meta = {
  title: 'Complex/TopicChips',
  component: TopicChips,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: `${BREAKPOINTS.xs}px`, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    label: {
      control: 'text',
      description: 'Section label or header text',
    },
  },
} satisfies Meta<typeof TopicChips>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractiveTopicChips = (args: React.ComponentProps<typeof TopicChips>) => {
  const [selected, setSelected] = useState(args.selectedId || sampleChips[0].id);

  return <TopicChips {...args} selectedId={selected} onSelect={setSelected} />;
};

export const Default: Story = {
  render: InteractiveTopicChips,
  args: {
    label: 'Select inquiry topic',
    options: sampleChips,
    selectedId: 'cert',
  },
};

export const WithoutLabel: Story = {
  render: InteractiveTopicChips,
  args: {
    ariaLabel: 'Inquiry topics',
    options: sampleChips,
    selectedId: 'session',
  },
};
