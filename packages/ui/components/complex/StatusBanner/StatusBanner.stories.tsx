import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import { StatusBanner } from './StatusBanner';
import type { StatusBannerTone } from './StatusBanner.types';

type MatrixIcon = 'with icon' | 'without icon';

const MATRIX_TONES: Record<StatusBannerTone, string> = {
  success: '🟢',
  danger: '🔴',
  warning: '⚠️',
  info: 'ℹ️',
};
const MATRIX_ICONS: readonly MatrixIcon[] = ['with icon', 'without icon'];

const meta = {
  title: 'Complex/StatusBanner',
  component: StatusBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['success', 'danger', 'warning', 'info'],
      description: 'Visual tone for the status banner',
    },
    children: {
      control: 'text',
      description: 'Banner content or message text',
    },
  },
} satisfies Meta<typeof StatusBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  args: {
    tone: 'info',
    children: null,
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={Object.keys(MATRIX_TONES) as StatusBannerTone[]}
      columns={MATRIX_ICONS}
      renderCell={(tone: StatusBannerTone, icon: MatrixIcon) => (
        <div style={{ width: '360px' }}>
          <StatusBanner tone={tone} icon={icon === 'with icon' ? MATRIX_TONES[tone] : undefined}>
            Registration for elective courses is now open
          </StatusBanner>
        </div>
      )}
    />
  ),
};
