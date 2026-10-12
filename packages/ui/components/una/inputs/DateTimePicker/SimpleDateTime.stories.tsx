import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SimpleDateTime } from './SimpleDateTime';

const meta = {
  title: 'Una/Inputs/SimpleDateTime',
  component: SimpleDateTime,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof SimpleDateTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div
      style={{
        minHeight: '400px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <SimpleDateTime />
    </div>
  ),
};
