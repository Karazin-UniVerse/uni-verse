import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import { Spinner } from './Spinner';
import type { SpinnerProps } from './Spinner.types';

type MatrixSize = NonNullable<SpinnerProps['size']>;
type MatrixContent = 'plain' | 'with tip';

const MATRIX_SIZES: readonly MatrixSize[] = ['small', 'medium', 'large'];
const MATRIX_CONTENT: Record<MatrixContent, Pick<SpinnerProps, 'tip'>> = {
  plain: {},
  'with tip': { tip: 'Loading…' },
};

const meta = {
  title: 'Una/Feedback/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
      description: 'Розмір спінера',
    },
    tip: {
      control: 'text',
      description: 'Текстовий підпис під спінером',
    },
    ariaLabel: {
      control: 'text',
      description: 'Доступна назва для зчитувачів екрана',
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={MATRIX_SIZES}
      columns={Object.keys(MATRIX_CONTENT) as MatrixContent[]}
      renderCell={(size: MatrixSize, content: MatrixContent) => (
        <Spinner size={size} {...MATRIX_CONTENT[content]} />
      )}
    />
  ),
};
