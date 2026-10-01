import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Skeleton } from './Skeleton';

const meta = {
  title: 'Una/Feedback/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    width: {
      control: 'text',
      description: 'Ширина скелетона (число у пікселях або CSS-рядок)',
    },
    height: {
      control: 'text',
      description: 'Висота скелетона (число у пікселях або CSS-рядок)',
    },
    borderRadius: {
      control: 'text',
      description: 'Радіус заокруглення кутів',
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    width: '320px',
    height: '140px',
    borderRadius: '8px',
  },
};

export const Avatar: Story = {
  args: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
  },
};

export const TextLine: Story = {
  args: {
    width: '240px',
    height: '16px',
    borderRadius: '4px',
  },
};

export const CardMockup: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '300px',
        padding: '16px',
        border: '1px solid var(--border-color, #e0e0e0)',
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Skeleton width={44} height={44} borderRadius="50%" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <Skeleton width="75%" height={16} borderRadius={4} />
          <Skeleton width="45%" height={12} borderRadius={4} />
        </div>
      </div>
      <Skeleton width="100%" height={90} borderRadius={8} />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
        <Skeleton width={64} height={28} borderRadius={6} />
        <Skeleton width={64} height={28} borderRadius={6} />
      </div>
    </div>
  ),
};
