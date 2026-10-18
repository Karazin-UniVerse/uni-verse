import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BREAKPOINTS } from '@universe/core/constants/breakpoints';

import { SegmentedControl } from './SegmentedControl';

const sampleItems = [
  { id: 'subjects', label: 'Subjects' },
  { id: 'grades', label: 'Grades' },
  { id: 'assignments', label: 'Assignments' },
];

const meta = {
  title: 'Complex/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: `${BREAKPOINTS.sm}px`, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SegmentedControl<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractiveSegmentedControl = (
  args: React.ComponentProps<typeof SegmentedControl<string>>,
) => {
  const [selectedId, setSelectedId] = useState(args.selectedId);

  return <SegmentedControl {...args} selectedId={selectedId} onSelect={setSelectedId} />;
};

export const Default: Story = {
  render: InteractiveSegmentedControl,
  args: {
    items: sampleItems,
    selectedId: 'subjects',
    panelIdPrefix: 'story-panel',
    ariaLabel: 'Study sections',
    onSelect: () => {},
  },
};

export const WithBadge: Story = {
  render: InteractiveSegmentedControl,
  args: {
    items: [...sampleItems.slice(0, 2), { ...sampleItems[2], badge: 3 }],
    selectedId: 'assignments',
    panelIdPrefix: 'story-panel',
    ariaLabel: 'Study sections',
    onSelect: () => {},
  },
};
