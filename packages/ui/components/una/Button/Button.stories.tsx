import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import { Button } from './Button';
import type { ButtonAsButtonProps } from './Button.types';

type MatrixRow =
  'primary' | 'secondary' | 'transparent' | 'primary disabled' | 'secondary disabled';
type MatrixSize = NonNullable<ButtonAsButtonProps['size']>;

const MATRIX_ROWS: Record<
  MatrixRow,
  Pick<ButtonAsButtonProps, 'variant' | 'isTransparent' | 'disabled'>
> = {
  primary: { variant: 'primary' },
  secondary: { variant: 'secondary' },
  transparent: { isTransparent: true },
  'primary disabled': { variant: 'primary', disabled: true },
  'secondary disabled': { variant: 'secondary', disabled: true },
};
const MATRIX_SIZES: readonly MatrixSize[] = ['small', 'medium', 'large'];

const meta: Meta<typeof Button> = {
  title: 'Una/Buttons/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    isTransparent: {
      control: { type: 'boolean' },
    },
    isLink: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={Object.keys(MATRIX_ROWS) as MatrixRow[]}
      columns={MATRIX_SIZES}
      renderCell={(row: MatrixRow, size: MatrixSize) => (
        <Button size={size} {...MATRIX_ROWS[row]}>
          Button
        </Button>
      )}
    />
  ),
};
