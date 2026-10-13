import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mail, Phone, Clock, Send } from 'lucide-react';

import { VariantRow } from '../../../storybook/VariantMatrix/VariantRow';
import { ContactInfoGrid } from './ContactInfoGrid';
import type { ContactInfoItem } from './ContactInfoGrid.types';

type MatrixIcons = 'with icons' | 'without icons';

const ITEMS_WITH_ICONS: ContactInfoItem[] = [
  { id: 'email', icon: <Mail size={16} />, label: 'Email:', value: 'dean.cs@karazin.ua' },
  { id: 'phone', icon: <Phone size={16} />, label: 'Phone:', value: '+38 (057) 707-55-55' },
  {
    id: 'schedule',
    icon: <Clock size={16} />,
    label: 'Office hours:',
    value: 'Mon-Fri: 09:00 - 17:00',
  },
  { id: 'telegram', icon: <Send size={16} />, label: 'Telegram:', value: '@karazin_edean' },
];
const MATRIX_ITEMS: Record<MatrixIcons, ContactInfoItem[]> = {
  'with icons': ITEMS_WITH_ICONS,
  'without icons': ITEMS_WITH_ICONS.map(({ id, label, value }: ContactInfoItem) => ({
    id,
    label,
    value,
  })),
};

const meta = {
  title: 'Complex/ContactInfoGrid',
  component: ContactInfoGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    items: {
      description: 'Array of contact information entries (icon, label, value)',
    },
  },
} satisfies Meta<typeof ContactInfoGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  args: {
    items: [],
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantRow
      columns={Object.keys(MATRIX_ITEMS) as MatrixIcons[]}
      renderCell={(icons: MatrixIcons) => (
        <div style={{ width: '420px' }}>
          <ContactInfoGrid items={MATRIX_ITEMS[icons]} />
        </div>
      )}
    />
  ),
};
