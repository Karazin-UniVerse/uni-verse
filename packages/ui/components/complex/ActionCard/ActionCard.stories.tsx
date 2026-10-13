import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText } from 'lucide-react';

import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import { ActionCard } from './ActionCard';
import type { ActionCardIconTone, ActionCardProps } from './ActionCard.types';

type MatrixBadge = 'no badge' | 'with badge';

const MATRIX_ICON_TONES: readonly ActionCardIconTone[] = [
  'default',
  'moodle',
  'assignments',
  'schedule',
  'dean',
  'opportunities',
];
const MATRIX_BADGES: Record<MatrixBadge, Pick<ActionCardProps, 'badge' | 'badgeTone'>> = {
  'no badge': {},
  'with badge': { badge: 3, badgeTone: 'alert' },
};

const meta = {
  title: 'Complex/ActionCard',
  component: ActionCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    iconTone: {
      control: 'select',
      options: ['default', 'moodle', 'assignments', 'schedule', 'dean', 'opportunities'],
      description: 'Color tone of the icon wrapper',
    },
    badgeTone: {
      control: 'select',
      options: ['default', 'info', 'alert'],
      description: 'Color tone of the optional badge',
    },
    title: {
      control: 'text',
      description: 'Title of the action card',
    },
    description: {
      control: 'text',
      description: 'Short description of the action',
    },
    badge: {
      control: 'text',
      description: 'Badge label or counter value',
    },
    isExternal: {
      control: 'boolean',
      description: 'Whether the action links to an external resource',
    },
  },
} satisfies Meta<typeof ActionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  args: {
    title: 'Title',
    description: 'Description',
    icon: null,
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={MATRIX_ICON_TONES}
      columns={Object.keys(MATRIX_BADGES) as MatrixBadge[]}
      renderCell={(iconTone: ActionCardIconTone, badge: MatrixBadge) => (
        <div style={{ width: '240px' }}>
          <ActionCard
            title="Action"
            description="Short description"
            icon={<FileText size={22} />}
            iconTone={iconTone}
            {...MATRIX_BADGES[badge]}
          />
        </div>
      )}
    />
  ),
};
