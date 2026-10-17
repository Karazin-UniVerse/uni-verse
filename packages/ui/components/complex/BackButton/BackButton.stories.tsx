import type { Meta, StoryObj } from '@storybook/react';

import { BackButton } from './BackButton';

const meta = {
  title: 'Complex/BackButton',
  component: BackButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    label: 'Назад до курсів',
    onClick: () => {},
  },
} satisfies Meta<typeof BackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
