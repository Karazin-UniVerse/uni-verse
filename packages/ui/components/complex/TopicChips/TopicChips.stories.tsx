import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { TopicChips } from './TopicChips';

const sampleChips = [
  { id: 'cert', label: 'Довідка про навчання' },
  { id: 'transcript', label: 'Академічна виписка' },
  { id: 'session', label: 'Питання щодо сесії' },
  { id: 'individual', label: 'Індивідуальний план' },
  { id: 'other', label: 'Інше питання' },
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
      <div style={{ width: '480px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    label: {
      control: 'text',
      description: 'Текст підпису секції',
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
    label: 'Оберіть тему звернення',
    options: sampleChips,
    selectedId: 'cert',
  },
};

export const WithoutLabel: Story = {
  render: InteractiveTopicChips,
  args: {
    options: sampleChips,
    selectedId: 'session',
  },
};
