import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchX } from 'lucide-react';

import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import { Empty } from './Empty';
import type { EmptyProps } from './Empty.types';

type MatrixIcon = 'default icon' | 'custom icon';
type MatrixText = 'default text' | 'custom text';

const MATRIX_ICONS: Record<MatrixIcon, Pick<EmptyProps, 'icon'>> = {
  'default icon': {},
  'custom icon': { icon: <SearchX size={48} aria-hidden /> },
};
const MATRIX_TEXTS: Record<MatrixText, Pick<EmptyProps, 'description'>> = {
  'default text': {},
  'custom text': { description: 'No results found' },
};

const meta = {
  title: 'Una/Feedback/Empty',
  component: Empty,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    description: {
      control: 'text',
      description: 'Текстовий опис для порожнього стану',
    },
  },
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={Object.keys(MATRIX_ICONS) as MatrixIcon[]}
      columns={Object.keys(MATRIX_TEXTS) as MatrixText[]}
      renderCell={(icon: MatrixIcon, text: MatrixText) => (
        <Empty {...MATRIX_ICONS[icon]} {...MATRIX_TEXTS[text]} />
      )}
    />
  ),
};
