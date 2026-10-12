import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import { Tag } from './Tag';
import type { TagTone } from './Tag.types';

const MATRIX_TONES: readonly TagTone[] = [
  'default',
  'neutral',
  'success',
  'warning',
  'info',
  'danger',
];
const MATRIX_CONTENT = {
  short: 'Tag',
  long: 'A considerably longer tag label',
} as const;

const meta = {
  title: 'Una/DataDisplay/Tag',
  component: Tag,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    tone: {
      control: { type: 'select' },
      options: ['default', 'neutral', 'success', 'warning', 'info', 'danger'],
      description: 'Колірний тон тегу',
    },
    children: {
      control: 'text',
      description: 'Вміст тегу',
    },
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={MATRIX_TONES}
      columns={Object.keys(MATRIX_CONTENT) as (keyof typeof MATRIX_CONTENT)[]}
      renderCell={(tone: TagTone, content: keyof typeof MATRIX_CONTENT) => (
        <Tag tone={tone}>{MATRIX_CONTENT[content]}</Tag>
      )}
    />
  ),
};
